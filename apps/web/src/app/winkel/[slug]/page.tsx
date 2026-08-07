import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Offer, SupermarketSlug } from "@superscout/core";
import { CATEGORY_LABEL, categorizeOffer } from "@superscout/core";
import { byBiggestDiscount, getOffers } from "@/lib/offers";
import { formatEuro, isExVat, STORE_META, offerSlug, validUntilShort } from "@/lib/format";
import { DEAL_TYPES } from "@/lib/deal-types";
import { OfferGrid } from "@/components/OfferGrid";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, faqJsonLd, offerListJsonLd, SITE_URL } from "@/lib/seo";

export const revalidate = 1800;

type Params = { params: Promise<{ slug: string }> };

function storeOffers(slug: string) {
  return getOffers().filter((o) => o.source === slug);
}

export function generateStaticParams() {
  return [...new Set(getOffers().map((o) => o.source))].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const meta = STORE_META[slug as SupermarketSlug];
  if (!meta) return { title: "Winkel niet gevonden" };
  const count = storeOffers(slug).length;
  const title = `${meta.name} aanbiedingen deze week`;
  const description = `Alle ${count} actuele ${meta.name}-aanbiedingen op één plek. Vergelijk de acties van deze week en vind direct de beste deal. Dagelijks ververst.`;
  const canonical = `/winkel/${slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: "website", locale: "nl_NL", url: canonical },
  };
}

export default async function StorePage({ params }: Params) {
  const { slug } = await params;
  const meta = STORE_META[slug as SupermarketSlug];
  const offers = byBiggestDiscount(storeOffers(slug));
  if (!meta || offers.length === 0) notFound();

  const nowIso = new Date().toISOString();
  const canonical = `/winkel/${slug}`;
  const faq = storeFaq(meta.name, slug as SupermarketSlug, offers);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Winkels", path: "/winkels" },
          { name: meta.name, path: canonical },
        ])}
      />
      <JsonLd
        data={offerListJsonLd({
          name: `${meta.name} aanbiedingen`,
          description: `Actuele aanbiedingen van ${meta.name}.`,
          url: `${SITE_URL}${canonical}`,
          offers,
          slugOf: offerSlug,
        })}
      />
      <JsonLd data={faqJsonLd(`${SITE_URL}${canonical}#faq`, faq)} />

      <header className="py-8">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex h-9 items-center rounded-lg px-3 font-display text-base font-bold"
            style={{ background: meta.bg, color: meta.fg }}
          >
            {meta.name}
          </span>
          <span className="font-mono text-sm text-ink-soft">
            {offers.length} aanbiedingen · deze week
          </span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {meta.name} aanbiedingen
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          Bekijk alle actuele {meta.name}-aanbiedingen van deze week, gesorteerd op de grootste
          korting. Zet je favorieten in je mandje en bestel of haal ze direct bij {meta.name}.
        </p>
      </header>

      <div className="mt-2">
        <OfferGrid offers={offers} nowIso={nowIso} />
      </div>

      <StoreProse store={meta.name} offers={offers} faq={faq} />
    </div>
  );
}

/**
 * Store-specific FAQ, composed from that chain's live offer set.
 *
 * Generic answers repeated across ten store pages would be near-duplicate
 * content; every answer here quotes this chain's own numbers, so the pages
 * stay distinct and the FAQPage markup stays truthful as the data rolls over.
 */
function storeFaq(store: string, slug: SupermarketSlug, offers: Offer[]) {
  const best = offers.find((o) => o.pricing.savingsPercent !== null);
  // Not every chain supplies an end date; empty strings would sort to the front.
  const endDate = offers
    .map((o) => o.validUntil)
    .filter(Boolean)
    .sort()[0];

  const faq = [
    {
      q: `Hoeveel ${store}-aanbiedingen lopen er deze week?`,
      aText: `Er staan op dit moment ${offers.length} actuele ${store}-aanbiedingen op SuperScout, verspreid over ${new Set(offers.map(categorizeOffer)).size} productcategorieën. De lijst wordt dagelijks bijgewerkt.`,
    },
    {
      q: `Tot wanneer gelden de ${store}-aanbiedingen?`,
      aText: endDate
        ? `De eerstvolgende actie van ${store} loopt af ${validUntilShort(endDate)}. Bij elke aanbieding staat de eigen einddatum, zodat je ziet hoelang je nog hebt.`
        : `Bij elke aanbieding staat de einddatum die ${store} zelf opgeeft.`,
    },
    {
      q: `Wat is deze week de grootste korting bij ${store}?`,
      aText: best
        ? `De scherpste actie is nu ${best.title} met ${best.pricing.savingsPercent}% korting${
            best.pricing.currentPriceCents !== null
              ? ` voor ${formatEuro(best.pricing.currentPriceCents)}`
              : ""
          }. De lijst op deze pagina staat gesorteerd op korting, dus de grootste staat altijd bovenaan.`
        : `De lijst op deze pagina staat gesorteerd op korting, dus de scherpste ${store}-actie staat altijd bovenaan.`,
    },
    {
      q: `Vervangt SuperScout de ${store} folder?`,
      aText: `SuperScout haalt dezelfde acties op als in de folder van ${store} staan, maar zet ze naast die van alle andere supermarkten. Je hoeft dus niet per keten te bladeren om te zien waar iets het goedkoopst is.`,
    },
  ];

  if (isExVat(slug)) {
    faq.push({
      q: `Zijn de ${store}-prijzen inclusief btw?`,
      aText: `Nee. ${store} is een groothandel en publiceert prijzen exclusief btw. Reken bij het vergelijken met een gewone supermarkt dus nog btw bij de getoonde prijs.`,
    });
  }

  return faq;
}

/** Indexable explainer below the grid: unique copy plus the internal links
 *  that let Google reach the category and deal-type hubs from every store. */
function StoreProse({
  store,
  offers,
  faq,
}: {
  store: string;
  offers: Offer[];
  faq: { q: string; aText: string }[];
}) {
  // Top categories for this chain, so each store page links out differently.
  const counts = new Map<string, number>();
  for (const offer of offers) {
    const key = categorizeOffer(offer);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const topCategories = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const dealTypes = DEAL_TYPES.map((type) => ({
    ...type,
    count: offers.filter(type.matches).length,
  })).filter((type) => type.count > 0);

  return (
    <>
      <section className="mt-16 border-t border-line pt-12" aria-labelledby="verdiepen-heading">
        <h2 id="verdiepen-heading" className="font-display text-2xl font-bold tracking-tight">
          {store} aanbiedingen per categorie
        </h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {topCategories.map(([category, count]) => (
            <Link
              key={category}
              href={`/categorie/${category}`}
              className="rounded-full border border-line bg-surface px-4 py-2 text-sm transition-colors hover:border-ink/30"
            >
              {CATEGORY_LABEL[category as keyof typeof CATEGORY_LABEL]}{" "}
              <span className="font-mono text-xs text-ink-soft">{count}</span>
            </Link>
          ))}
        </div>

        {dealTypes.length > 0 ? (
          <>
            <h3 className="mt-10 font-display text-lg font-bold tracking-tight">
              Actievormen bij {store} deze week
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {dealTypes.map((type) => (
                <Link
                  key={type.slug}
                  href={`/acties/${type.slug}`}
                  className="rounded-full border border-line bg-surface px-4 py-2 text-sm transition-colors hover:border-ink/30"
                >
                  {type.label} <span className="font-mono text-xs text-ink-soft">{type.count}</span>
                </Link>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section className="mt-16 border-t border-line pt-12" aria-labelledby="store-faq-heading">
        <h2 id="store-faq-heading" className="font-display text-2xl font-bold tracking-tight">
          Veelgestelde vragen over {store} aanbiedingen
        </h2>
        <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {faq.map((item) => (
            <div key={item.q}>
              <dt className="font-display text-[16px] font-bold">{item.q}</dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-ink-soft">{item.aText}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-[15px] leading-relaxed text-ink-soft">
          SuperScout is niet verbonden aan {store}. Alle prijzen en voorwaarden komen van {store}{" "}
          zelf en worden dagelijks opnieuw opgehaald. Vergelijk ze met de{" "}
          <Link
            href="/winkels"
            className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
          >
            aanbiedingen van andere supermarkten
          </Link>{" "}
          voordat je boodschappen doet.
        </p>
      </section>
    </>
  );
}
