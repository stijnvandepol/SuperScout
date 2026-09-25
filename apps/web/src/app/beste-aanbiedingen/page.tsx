import type { Metadata } from "next";
import Link from "next/link";
import type { Offer, SupermarketSlug } from "@superscout/core";
import { CATEGORY_LABEL, categorizeOffer, isoWeekNumber, weeklyPicks } from "@superscout/core";
import { categoriesPresent, dataFetchedAt, getOffers } from "@/lib/offers";
import { chainCount, chainSentence } from "@/lib/chains";
import { formatEuro, offerSlug, STORE_META } from "@/lib/format";
import { OfferCard } from "@/components/OfferCard";
import { OfferGrid } from "@/components/OfferGrid";
import { ImageHostPreconnect } from "@/components/ImageHostPreconnect";
import { ShareOfferButton } from "@/components/ShareOfferButton";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, itemListJsonLd, SITE_URL } from "@/lib/seo";

// Read at request time, never baked into the build: see `loadRaw` in
// lib/offers.ts for what a build-time prerender of this page contains.
export const dynamic = "force-dynamic";

const PATH = "/beste-aanbiedingen";
const CHEAP_LIMIT_CENTS = 500;

export function generateMetadata(): Metadata {
  const week = isoWeekNumber(new Date());
  const title = `De beste aanbiedingen van deze week (week ${week})`;
  const description = `De 10 scherpste aanbiedingen van week ${week}, gekozen uit alle acties van ${chainSentence(4)}: per winkel de beste deal, en wat er onder de €5 te halen is. Dagelijks bijgewerkt.`;
  return {
    title,
    description,
    alternates: { canonical: PATH },
    openGraph: { title, description, type: "website", locale: "nl_NL", url: PATH },
  };
}

/**
 * The weekly shortlist, as a page.
 *
 * "Beste aanbiedingen deze week" is the head query of this niche, and the
 * selection already existed — `weeklyPicks` has been drafting the Monday
 * social posts from the same data for months. It never had a URL. Now the
 * thing people share and the thing Google ranks are the same page, and the
 * list is recomputed on every request instead of once a week in an issue.
 *
 * Every section is a real cut through the data (not a keyword variation of
 * the same list), and each one links out to the store and category hubs.
 */
export default function BesteAanbiedingenPage() {
  const offers = getOffers();
  const now = new Date();
  const nowIso = now.toISOString();
  const week = isoWeekNumber(now);
  const dataDate = dataFetchedAt();

  const top = weeklyPicks(offers, { nowIso, limit: 10 });
  const perStore = bestPerStore(offers, nowIso);
  const cheap = weeklyPicks(
    offers.filter(
      (o) => o.pricing.currentPriceCents !== null && o.pricing.currentPriceCents <= CHEAP_LIMIT_CENTS,
    ),
    { nowIso, limit: 8 },
  );
  const perCategory = bestPerCategory(offers, nowIso);
  const topOffers = top.map((p) => p.offer);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      <ImageHostPreconnect offers={topOffers} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Beste aanbiedingen", path: PATH },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `De beste aanbiedingen van week ${week}`,
          url: `${SITE_URL}${PATH}`,
          inLanguage: "nl-NL",
          isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
          mainEntity: itemListJsonLd(topOffers, offerSlug),
        }}
      />

      <header className="py-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Week {week}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          De beste aanbiedingen van deze week
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          Uit {offers.length} lopende acties bij {chainCount()} winkels hebben we de scherpste
          gehaald. Geen redactionele smaak: alleen echte producten, minstens twee dagen geldig, en
          nooit meer dan twee van dezelfde winkel — anders wint elke week de keten met de grootste
          opruiming.
        </p>
        {top.length > 0 ? (
          <div className="mt-5">
            <ShareOfferButton
              url={`${SITE_URL}${PATH}`}
              text={`De 10 beste aanbiedingen van week ${week}`}
            />
          </div>
        ) : null}
      </header>

      {top.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <p className="font-display text-lg">De nieuwe acties komen eraan</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            Er lopen nu te weinig acties met een duidelijke korting om een eerlijke top 10 te maken.
            Bekijk{" "}
            <Link href="/volgende-week" className="font-bold text-ink underline underline-offset-2">
              wat er volgende week in de aanbieding gaat
            </Link>
            .
          </p>
        </div>
      ) : (
        <section aria-labelledby="top-heading">
          <h2 id="top-heading" className="font-display text-2xl font-bold tracking-tight">
            Top {top.length}: de grootste korting
          </h2>
          <ol className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {top.map((pick, i) => (
              <li key={pick.offer.id} className="relative">
                <span className="absolute -left-1.5 -top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-ink font-mono text-xs font-bold text-bg">
                  {i + 1}
                </span>
                <OfferCard offer={pick.offer} nowIso={nowIso} dataDate={dataDate} priority={i === 0} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {perStore.length > 1 ? (
        <section className="mt-16 border-t border-line pt-12" aria-labelledby="winkel-heading">
          <h2 id="winkel-heading" className="font-display text-2xl font-bold tracking-tight">
            De beste deal per winkel
          </h2>
          <ul className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface">
            {perStore.map(({ source, offer, percent }) => (
              <li key={source} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <Link href={`/winkel/${source}`} className="font-mono text-xs font-bold uppercase tracking-wide text-ink-soft hover:text-ink">
                    {STORE_META[source].name}
                  </Link>
                  <Link href={`/aanbieding/${offerSlug(offer)}`} className="mt-0.5 block truncate font-display font-medium hover:underline">
                    {offer.title}
                  </Link>
                </span>
                <span className="shrink-0 font-mono text-sm">
                  {offer.pricing.currentPriceCents !== null ? `${formatEuro(offer.pricing.currentPriceCents)} · ` : ""}
                  <strong className="text-fresh">−{percent}%</strong>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {cheap.length > 0 ? (
        <section className="mt-16 border-t border-line pt-12" aria-labelledby="goedkoop-heading">
          <h2 id="goedkoop-heading" className="font-display text-2xl font-bold tracking-tight">
            Scherp en onder de €5
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            De grootste kortingen op producten die in de actie minder dan vijf euro kosten — het
            soort deal dat je zonder nadenken in je mandje gooit.
          </p>
          <div className="mt-5">
            <OfferGrid offers={cheap.map((p) => p.offer)} nowIso={nowIso} dataDate={dataDate} />
          </div>
        </section>
      ) : null}

      {perCategory.length > 0 ? (
        <section className="mt-16 border-t border-line pt-12" aria-labelledby="categorie-heading">
          <h2 id="categorie-heading" className="font-display text-2xl font-bold tracking-tight">
            Per categorie de scherpste
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {perCategory.map(({ slug, offer, percent }) => (
              <li key={slug} className="rounded-2xl border border-line bg-surface px-4 py-3">
                <Link href={`/categorie/${slug}`} className="font-mono text-xs font-bold uppercase tracking-wide text-ink-soft hover:text-ink">
                  {CATEGORY_LABEL[slug]}
                </Link>
                <Link href={`/aanbieding/${offerSlug(offer)}`} className="mt-0.5 block font-display font-medium hover:underline">
                  {offer.title}
                </Link>
                <span className="font-mono text-xs text-ink-soft">
                  {STORE_META[offer.source].name} · −{percent}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-16 border-t border-line pt-12" aria-labelledby="methode-heading">
        <h2 id="methode-heading" className="font-display text-2xl font-bold tracking-tight">
          Zo kiezen we
        </h2>
        <div className="mt-4 max-w-3xl space-y-4 text-[15px] leading-relaxed text-ink-soft">
          <p>
            Winkels schrijven dezelfde korting op tien manieren op: 1+1 gratis, 2e halve prijs, 3
            voor €5, 25% korting. We rekenen elke actie om naar korting per stuk, zodat ze eerlijk
            naast elkaar kunnen staan. Waar dat niet zonder gokken kan — een “3 voor €5” zonder
            normale prijs erbij — laten we de actie weg uit deze lijst in plaats van een getal te
            verzinnen.
          </p>
          <p>
            Er wordt niet voor plaatsing betaald en er is geen redactie die kiest. Wat hier staat,
            staat er omdat de korting het grootst is. De lijst wordt elke dag opnieuw berekend; kom
            je donderdag terug, dan kan hij er anders uitzien dan maandag.
          </p>
          <p>
            Zoek je iets specifieks? Gebruik de{" "}
            <Link href="/" className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2">
              zoekfunctie
            </Link>{" "}
            en volg een product: dan zie je bij je volgende bezoek meteen of het in de aanbieding
            is. Of bekijk{" "}
            <Link href="/acties/1-plus-1-gratis" className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2">
              alle 1+1 gratis acties
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}

/** Each live chain's single sharpest pick, sharpest chain first. */
function bestPerStore(offers: Offer[], nowIso: string) {
  const picks = weeklyPicks(offers, { nowIso, limit: 500, maxPerStore: 1 });
  return picks.map((p) => ({
    source: p.offer.source as SupermarketSlug,
    offer: p.offer,
    percent: p.discountPercent,
  }));
}

/** The sharpest pick in each indexable category, in taxonomy order. */
function bestPerCategory(offers: Offer[], nowIso: string) {
  return categoriesPresent()
    .filter((c) => c.slug !== "overig")
    .flatMap((c) => {
      const [pick] = weeklyPicks(
        offers.filter((o) => categorizeOffer(o) === c.slug),
        { nowIso, limit: 1 },
      );
      return pick ? [{ slug: c.slug, offer: pick.offer, percent: pick.discountPercent }] : [];
    })
    .slice(0, 12);
}
