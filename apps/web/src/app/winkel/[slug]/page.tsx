import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Offer, SupermarketSlug } from "@superscout/core";
import type { CycleStart } from "@superscout/core";
import { CATEGORY_LABEL, categorizeOffer, cycleStart } from "@superscout/core";
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
    alternates: {
      canonical,
      // Overrides the layout's site-wide feed: on a store page the useful
      // subscription is that chain, not everything.
      types: {
        "application/rss+xml": [
          { url: `${canonical}/feed.xml`, title: `${meta.name} aanbiedingen` },
        ],
      },
    },
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
  // Derived, not hardcoded: chains do move their cycle, and this page states it
  // as fact. Null when the chain's own dates do not support a clear answer.
  const cycle = cycleStart(offers);
  const faq = storeFaq(meta.name, slug as SupermarketSlug, offers, cycle);

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
        {/* "deze week" belongs in the H1, not only the <title>. The queries
            that reach these pages are "albert heijn aanbiedingen deze week",
            "acties jumbo", "<chain> folder" — the H1 was the one place the
            week qualifier was missing. */}
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {meta.name} aanbiedingen deze week
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          Alle {offers.length} acties uit de {meta.name} folder van deze week op één pagina,
          gesorteerd op de grootste korting
          {cycle ? `. Nieuwe ${meta.name}-aanbiedingen starten op ${cycle.label}` : ""}. Zet je
          favorieten in je mandje en haal ze direct bij {meta.name}.
        </p>
      </header>

      <div className="mt-2">
        <OfferGrid offers={offers} nowIso={nowIso} />
      </div>

      <StoreProse store={meta.name} slug={slug} offers={offers} faq={faq} />
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
function storeFaq(
  store: string,
  slug: SupermarketSlug,
  offers: Offer[],
  cycle: CycleStart | null,
) {
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

  // Answers "wanneer komt de nieuwe folder" — a recurring query for every chain
  // — but only when the chain's own dates actually support an answer.
  if (cycle) {
    faq.push({
      q: `Wanneer komen de nieuwe ${store}-aanbiedingen?`,
      aText: `${store} start een nieuwe actieweek op ${cycle.label}; ${Math.round(cycle.share * 100)}% van de lopende acties begint op die dag. De folder verschijnt meestal een paar dagen daarvoor, dus vanaf dat moment staan de nieuwe acties hier. Wat al bekend is van volgende week vind je op de pagina met aanbiedingen van volgende week.`,
    });
  }

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
  slug,
  offers,
  faq,
}: {
  store: string;
  slug: string;
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
          Wil je hier niet elke week naar terug? Abonneer je op de{" "}
          <a
            href={`/winkel/${slug}/feed.xml`}
            className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
          >
            RSS-feed van {store}
          </a>{" "}
          — nieuwe acties komen dan vanzelf binnen in je reader, zonder account en zonder dat wij
          iets van je hoeven te weten.
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          SuperScout is niet verbonden aan {store}. Alle prijzen en voorwaarden komen van {store}{" "}
          zelf en worden dagelijks opnieuw opgehaald. Afgelopen acties blijven bewaard, zodat je
          kunt terugzien wat een product eerder bij {store} in de aanbieding kostte.
        </p>
      </section>

      <StoreCrosslinks store={store} slug={slug} />
    </>
  );
}

/**
 * Links from each store page to every other one.
 *
 * Store pages were the site's most isolated hubs: reachable from the footer,
 * but not from each other, which left each one a leaf with a single inbound
 * path. Cross-linking turns ten leaves into a connected cluster, and the anchor
 * text ("Jumbo aanbiedingen") is the phrasing those pages are meant to rank
 * for. It also serves the actual visitor intent, which on a deals site is
 * almost always comparative.
 */
function StoreCrosslinks({ store, slug }: { store: string; slug: string }) {
  const others = [...new Set(getOffers().map((o) => o.source))]
    .filter((source) => source !== slug)
    .sort((a, b) => STORE_META[a].name.localeCompare(STORE_META[b].name, "nl"));

  if (others.length === 0) return null;

  return (
    <section className="mt-16 border-t border-line pt-12">
      <h2 className="font-display text-2xl font-bold tracking-tight">
        Vergelijk {store} met andere supermarkten
      </h2>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        Een keten met de scherpste actie op één product is zelden de goedkoopste op je hele
        boodschappenlijst. Bekijk wat de rest deze week doet.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {others.map((source) => (
          <Link
            key={source}
            href={`/winkel/${source}`}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm transition-colors hover:border-ink/30"
          >
            {STORE_META[source].name} aanbiedingen
          </Link>
        ))}
      </div>
      <p className="mt-6 text-[15px] leading-relaxed text-ink-soft">
        Of bekijk{" "}
        <Link
          href="/volgende-week"
          className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
        >
          wat er volgende week in de aanbieding gaat
        </Link>{" "}
        en de{" "}
        <Link
          href="/spaaracties"
          className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
        >
          spaaracties van de supermarkten
        </Link>
        .
      </p>
    </section>
  );
}
