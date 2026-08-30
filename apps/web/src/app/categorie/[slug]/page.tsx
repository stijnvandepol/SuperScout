import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Offer, SupermarketSlug } from "@superscout/core";
import { CATEGORY_LABEL, type CategorySlug } from "@superscout/core";
import {
  allCategoriesPresent,
  byBiggestDiscount,
  dataFetchedAt,
  isIndexableCategory,
  offersInCategory,
} from "@/lib/offers";
import { formatEuro, isExVat, offerSlug, STORE_META, validUntilShort } from "@/lib/format";
import { DEAL_TYPES } from "@/lib/deal-types";
import { OfferGrid } from "@/components/OfferGrid";
import { ImageHostPreconnect } from "@/components/ImageHostPreconnect";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, faqJsonLd, offerListJsonLd, SITE_URL } from "@/lib/seo";
import { chainCountWord } from "@/lib/chains";

export const revalidate = 1800;

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  // Thin categories are still prerendered so an existing link never 404s;
  // they simply carry a noindex below.
  return allCategoriesPresent().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const label = CATEGORY_LABEL[slug as CategorySlug];
  if (!label) return { title: "Categorie niet gevonden" };
  const offers = offersInCategory(slug);
  const count = offers.length;
  const stores = new Set(offers.map((o) => o.source)).size;

  const title = `${label} aanbiedingen deze week`;
  // Names the chain count as well as the offer count: the query behind a
  // category search is nearly always "where is this cheapest", and a snippet
  // that answers "we compared 9 supermarkets" earns the click that "we have 34
  // offers" does not.
  const description = `Alle ${count} ${label.toLowerCase()}-aanbiedingen van deze week, van ${stores} supermarkten naast elkaar. Vergelijk prijs en korting en zie meteen welke keten de beste deal heeft.`;
  const canonical = `/categorie/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    // A handful of products is not a page worth ranking; asking Google to
    // index it invites a thin-content judgement on the whole section.
    ...(isIndexableCategory(count) ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title, description, type: "website", locale: "nl_NL", url: canonical },
  };
}

/** Cheapest priced offer, or undefined when the whole slice is priceless. */
function cheapest(offers: Offer[]): Offer | undefined {
  return offers
    .filter((o) => o.pricing.currentPriceCents !== null)
    .sort((a, b) => a.pricing.currentPriceCents! - b.pricing.currentPriceCents!)[0];
}

interface StoreSlice {
  source: SupermarketSlug;
  offers: Offer[];
  cheapest: Offer | undefined;
}

/** This category split per chain, biggest selection first. */
function perStore(offers: Offer[]): StoreSlice[] {
  const grouped = new Map<SupermarketSlug, Offer[]>();
  for (const offer of offers) {
    const list = grouped.get(offer.source);
    if (list) list.push(offer);
    else grouped.set(offer.source, [offer]);
  }
  return [...grouped.entries()]
    .map(([source, list]) => ({ source, offers: list, cheapest: cheapest(list) }))
    .sort((a, b) => b.offers.length - a.offers.length);
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const label = CATEGORY_LABEL[slug as CategorySlug];
  const offers = byBiggestDiscount(offersInCategory(slug));
  if (!label || offers.length === 0) notFound();

  const nowIso = new Date().toISOString();
  const canonical = `/categorie/${slug}`;
  const slices = perStore(offers);
  const faq = categoryFaq(label, offers, slices);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      <ImageHostPreconnect offers={offers} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Categorieën", path: "/categorieen" },
          { name: label, path: canonical },
        ])}
      />
      <JsonLd
        data={offerListJsonLd({
          name: `${label} aanbiedingen`,
          description: `Actuele aanbiedingen in ${label}.`,
          url: `${SITE_URL}${canonical}`,
          offers,
          slugOf: offerSlug,
        })}
      />
      {isIndexableCategory(offers.length) ? (
        <JsonLd data={faqJsonLd(`${SITE_URL}${canonical}#faq`, faq)} />
      ) : null}

      <header className="py-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Categorie</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {label} aanbiedingen deze week
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          Alle {offers.length} actuele aanbiedingen in {label.toLowerCase()} van deze week, van{" "}
          {slices.length} supermarkten naast elkaar en gesorteerd op de grootste korting.
        </p>
      </header>

      <div className="mt-2">
        <OfferGrid offers={offers} nowIso={nowIso} dataDate={dataFetchedAt()} />
      </div>

      <CategoryProse label={label} slug={slug} offers={offers} slices={slices} faq={faq} />
    </div>
  );
}

/**
 * Everything below the grid.
 *
 * The page used to be a header and a grid, and nothing else — which is why it
 * sat at position 29-50 in Search Console. A listing with no prose of its own
 * competes only on the product titles that happen to be in the grid this week,
 * and those turn over completely every seven days, so Google never accumulates
 * a stable idea of what the page is about. Everything here is derived from this
 * category's own numbers, so it is unique per page and true after every roll.
 */
function CategoryProse({
  label,
  slug,
  offers,
  slices,
  faq,
}: {
  label: string;
  slug: string;
  offers: Offer[];
  slices: StoreSlice[];
  faq: { q: string; aText: string }[];
}) {
  const lower = label.toLowerCase();
  const best = offers.find((o) => o.pricing.savingsPercent !== null);
  const cheapestOverall = cheapest(offers);
  const priced = offers.filter((o) => o.pricing.currentPriceCents !== null);
  const dearest = priced.sort(
    (a, b) => b.pricing.currentPriceCents! - a.pricing.currentPriceCents!,
  )[0];

  const dealTypes = DEAL_TYPES.map((type) => ({
    ...type,
    count: offers.filter(type.matches).length,
  })).filter((type) => type.count > 0);

  const siblings = allCategoriesPresent()
    .filter((c) => c.slug !== slug && isIndexableCategory(c.count))
    .slice(0, 10);

  return (
    <>
      <section className="mt-16 border-t border-line pt-12" aria-labelledby="winkels-heading">
        <h2 id="winkels-heading" className="font-display text-2xl font-bold tracking-tight">
          {label} in de aanbieding per supermarkt
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          Welke keten heeft deze week het meeste in {lower}, en waar begint de prijs?
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {slices.map((slice) => {
            const meta = STORE_META[slice.source];
            return (
              <Link
                key={slice.source}
                href={`/winkel/${slice.source}`}
                className="rounded-2xl border border-line bg-surface p-4 transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
              >
                <span
                  className="inline-block rounded-md px-2 py-0.5 font-display text-xs font-bold"
                  style={{ background: meta.bg, color: meta.fg }}
                >
                  {meta.name}
                </span>
                <p className="mt-3 text-sm">
                  <strong className="font-semibold">{slice.offers.length}</strong>{" "}
                  {slice.offers.length === 1 ? "aanbieding" : "aanbiedingen"} in {lower}
                </p>
                {slice.cheapest ? (
                  <p className="mt-1 font-mono text-[11px] text-ink-soft">
                    vanaf {formatEuro(slice.cheapest.pricing.currentPriceCents)}
                    {isExVat(slice.source) ? " excl. btw" : ""}
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="over-heading">
        <h2 id="over-heading" className="font-display text-xl font-bold tracking-tight">
          Over de {lower}-aanbiedingen van deze week
        </h2>
        <div className="mt-4 max-w-3xl space-y-4 text-[15px] leading-relaxed text-ink-soft">
          <p>
            SuperScout verzamelt de weekacties van {chainCountWord()} Nederlandse supermarkten en bundelt ze per
            categorie. In {lower} staan deze week {offers.length} acties van {slices.length}{" "}
            {slices.length === 1 ? "keten" : "ketens"}
            {slices[0]
              ? `, waarvan ${STORE_META[slices[0].source].name} met ${slices[0].offers.length} de grootste selectie heeft`
              : ""}
            .
          </p>

          {cheapestOverall && dearest && cheapestOverall.id !== dearest.id ? (
            <p>
              De actieprijzen lopen uiteen van{" "}
              <Link
                href={`/aanbieding/${offerSlug(cheapestOverall)}`}
                className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
              >
                {formatEuro(cheapestOverall.pricing.currentPriceCents)}
              </Link>{" "}
              tot {formatEuro(dearest.pricing.currentPriceCents)}. Dat verschil zegt op zichzelf
              weinig — verpakkingsgroottes verschillen — maar het geeft aan waar je bandbreedte
              ligt als je op prijs wilt kiezen.
            </p>
          ) : null}

          {best ? (
            <p>
              De scherpste korting in deze categorie is nu{" "}
              <Link
                href={`/aanbieding/${offerSlug(best)}`}
                className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
              >
                {best.title}
              </Link>{" "}
              bij {STORE_META[best.source].name} met {best.pricing.savingsPercent}% korting
              {best.validUntil ? `, geldig ${validUntilShort(best.validUntil)}` : ""}. Het grid
              hierboven staat op korting gesorteerd, dus de grootste staat altijd bovenaan.
            </p>
          ) : null}

          <p>
            Aanbiedingen worden dagelijks bij de supermarkten zelf opgehaald. Afgelopen acties
            blijven bewaard, zodat je bij een volgende korting kunt terugzien wat hetzelfde product
            eerder in de aanbieding kostte — en of {lower} echt goedkoper is dan normaal. Benieuwd
            wat eraan komt? Bekijk de{" "}
            <Link
              href="/volgende-week"
              className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
            >
              aanbiedingen van volgende week
            </Link>
            .
          </p>
        </div>
      </section>

      {dealTypes.length > 0 ? (
        <section className="mt-14" aria-labelledby="actievorm-heading">
          <h2 id="actievorm-heading" className="font-display text-xl font-bold tracking-tight">
            {label} per actievorm
          </h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {dealTypes.map((type) => (
              <Link
                key={type.slug}
                href={`/acties/${type.slug}`}
                className="rounded-full border border-line bg-surface px-4 py-2 text-sm transition-colors hover:border-ink/30"
              >
                {type.label}{" "}
                <span className="font-mono text-xs text-ink-soft">{type.count}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-14" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="font-display text-xl font-bold tracking-tight">
          Veelgestelde vragen
        </h2>
        <dl className="mt-5 max-w-3xl space-y-6">
          {faq.map((item) => (
            <div key={item.q}>
              <dt className="font-display text-base font-bold">{item.q}</dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-ink-soft">{item.aText}</dd>
            </div>
          ))}
        </dl>
      </section>

      {siblings.length > 0 ? (
        <section className="mt-14 border-t border-line pt-10">
          <h2 className="font-display text-xl font-bold tracking-tight">Andere categorieën</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {siblings.map((sibling) => (
              <Link
                key={sibling.slug}
                href={`/categorie/${sibling.slug}`}
                className="rounded-full border border-line bg-surface px-4 py-2 text-sm transition-colors hover:border-ink/30"
              >
                {sibling.label}{" "}
                <span className="font-mono text-xs text-ink-soft">{sibling.count}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

/**
 * FAQ built from this category's own numbers.
 *
 * Every answer quotes live data, so the twenty category pages never share a
 * paragraph — generic answers repeated across them would be the near-duplicate
 * content that got these pages ignored in the first place.
 */
function categoryFaq(label: string, offers: Offer[], slices: StoreSlice[]) {
  const lower = label.toLowerCase();
  const cheapestOverall = cheapest(offers);
  const best = offers.find((o) => o.pricing.savingsPercent !== null);
  const biggest = slices[0];

  const faq = [
    {
      q: `Welke supermarkt heeft deze week de meeste ${lower}-aanbiedingen?`,
      aText: biggest
        ? `${STORE_META[biggest.source].name}, met ${biggest.offers.length} van de ${offers.length} lopende acties in ${lower}. In totaal hebben ${slices.length} supermarkten deze week iets in deze categorie in de aanbieding.`
        : `Deze week staan er ${offers.length} acties in ${lower} op SuperScout.`,
    },
    {
      q: `Wat is de goedkoopste ${lower}-aanbieding van deze week?`,
      aText: cheapestOverall
        ? `${cheapestOverall.title} bij ${STORE_META[cheapestOverall.source].name} voor ${formatEuro(cheapestOverall.pricing.currentPriceCents)}. Let bij het vergelijken op de verpakkingsgrootte: de laagste prijs is niet altijd de laagste prijs per kilo of liter.`
        : `Niet elke actie in deze categorie heeft een vaste actieprijs; bij die acties wordt de korting aan de kassa verrekend.`,
    },
    {
      q: `Waar vind ik de grootste korting op ${lower}?`,
      aText: best
        ? `De scherpste actie is nu ${best.title} bij ${STORE_META[best.source].name} met ${best.pricing.savingsPercent}% korting. Het overzicht op deze pagina staat gesorteerd op kortingspercentage, dus de grootste korting staat altijd bovenaan.`
        : `Het overzicht op deze pagina staat gesorteerd op kortingspercentage, dus de grootste korting staat altijd bovenaan.`,
    },
    {
      q: `Hoe vaak worden de ${lower}-aanbiedingen bijgewerkt?`,
      aText: `Dagelijks. SuperScout haalt de acties rechtstreeks bij de supermarkten op, dus zodra een keten een nieuwe week publiceert, staat die kort daarna op deze pagina. Afgelopen acties blijven bewaard om prijzen mee te kunnen vergelijken.`,
    },
  ];

  return faq;
}
