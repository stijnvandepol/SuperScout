import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Offer } from "@superscout/core";
import {
  CATEGORY_LABEL,
  type CategorySlug,
  categorizeOffer,
  daysUntilExpiry,
  isExpiringSoon,
  relatedOffers,
} from "@superscout/core";
import { productPath } from "@superscout/core";
import { currentEquivalent, getOffers, resolveBySlug } from "@/lib/offers";
import { productForOffer } from "@/lib/catalogue";
import { insightFor } from "@/lib/price-history";

import {
  formatEuro,
  freshnessLabel,
  isExVat,
  mechanismDescription,
  offerSlug,
  provenanceLabel,
  STORE_META,
  validUntilShort,
} from "@/lib/format";
import { OfferCard } from "@/components/OfferCard";
import { OutboundLink } from "@/components/OutboundLink";
import { ShareOfferButton } from "@/components/ShareOfferButton";
import { ReportOfferButton } from "@/components/ReportOfferButton";
import { StoreBadge } from "@/components/StoreBadge";
import { DiscountSticker } from "@/components/DiscountSticker";
import { AddToBasketButton } from "@/components/AddToBasketButton";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, productJsonLd, SITE_URL } from "@/lib/seo";

export const revalidate = 1800;

// Archived promotions are never pre-rendered — there are tens of thousands of
// them and only a handful are ever requested. ISR renders them on first hit and
// caches from there.
export const dynamicParams = true;

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getOffers().map((offer) => ({ slug: offerSlug(offer) }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolveBySlug(slug);
  if (!resolved) return { title: "Aanbieding niet gevonden — SuperScout" };

  const { offer, status } = resolved;
  const store = STORE_META[offer.source].name;
  const canonical = `/aanbieding/${slug}`;
  // Two shapes for the same number: the title wants a separator before it
  // ("Ananas — €2,49 bij Dirk"), running prose does not ("voor €2,49").
  // Sharing one string produced "voor — €2,49" in the meta description.
  const priced = offer.pricing.currentPriceCents !== null;
  const priceAmount = priced ? formatEuro(offer.pricing.currentPriceCents) : "";
  const price = priced ? ` — ${priceAmount}` : "";

  // Expired promotions never render: the page redirects to the live offer for
  // the same product, or 404s. Metadata is computed in parallel with the page,
  // so this result is discarded — it exists only to keep the type honest.
  if (status === "expired") return { title: "Aanbieding niet gevonden — SuperScout" };

  const upcoming = status === "upcoming";
  const title = `${offer.title}${price} bij ${store} — SuperScout`;
  // Nearly half the chains publish no end date, and `validUntilShort("")` is
  // an empty string — which put "Geldig ." into hundreds of snippets. A
  // missing date now drops the sentence instead of shipping half of it.
  const validity = upcoming
    ? offer.validFrom
      ? ` Geldig vanaf ${validUntilShort(offer.validFrom).replace("t/m ", "")}.`
      : ""
    : offer.validUntil
      ? ` Geldig ${validUntilShort(offer.validUntil)}.`
      : "";
  const description = upcoming
    ? `${offer.title} gaat in de aanbieding bij ${store}. ${mechanismDescription(offer)}${validity}`
    : `${offer.title} in de aanbieding bij ${store}. ${mechanismDescription(offer)}${validity}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "nl_NL",
      url: canonical,
      images: offer.imageUrl ? [offer.imageUrl] : [],
    },
  };
}

export default async function OfferPage({ params }: Params) {
  const { slug } = await params;
  const resolved = resolveBySlug(slug);
  if (!resolved) notFound();

  const { offer, status } = resolved;

  /*
   * A finished promotion is not a page worth showing.
   *
   * The archive was built to stop the weekly wave of 404s, and it did — but a
   * shopper who lands on "deze actie is afgelopen" got a dead end dressed up as
   * a page. So the URL keeps resolving, just not to an archive: if the same
   * product is on offer somewhere right now, that is what the visitor wanted
   * and they go straight to it; otherwise the URL is simply gone.
   *
   * The target is recomputed on every request rather than stored, so this stays
   * a single hop forever. A stored redirect would point at last week's
   * promotion, which itself expires, and the chain would grow a link a week.
   *
   * The product page is preferred over the current promotion because it is
   * permanent: sending an expired URL to this week's offer only moves the
   * problem to next week, while the catalogue entry is there whether or not
   * anything is discounted. Only two chains have a catalogue so far, so the
   * promotion remains the fallback.
   */
  if (status === "expired") {
    const catalogued = productForOffer(offer);
    if (catalogued) permanentRedirect(productPath(catalogued));

    const replacement = currentEquivalent(offer);
    if (replacement) permanentRedirect(`/aanbieding/${offerSlug(replacement)}`);
    notFound();
  }

  const nowIso = new Date().toISOString();
  const store = STORE_META[offer.source];
  const { sameBrand, alternatives, related } = relatedOffers(offer, getOffers());
  const soon = isExpiringSoon(offer.validUntil, nowIso);
  const days = daysUntilExpiry(offer.validUntil, nowIso);
  const { pricing } = offer;

  const canonical = `/aanbieding/${offerSlug(offer)}`;
  const url = `${SITE_URL}${canonical}`;
  const category = categorizeOffer(offer);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      <JsonLd data={productJsonLd(offer, url)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: store.name, path: `/winkel/${offer.source}` },
          { name: CATEGORY_LABEL[category], path: `/categorie/${category}` },
          { name: offer.title, path: canonical },
        ])}
      />

      <p className="pt-6 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
        <Link href={`/winkel/${offer.source}`} className="hover:text-ink">
          {store.name}
        </Link>
        {" · "}
        <Link href={`/categorie/${categorizeOffer(offer)}`} className="hover:text-ink">
          {CATEGORY_LABEL[categorizeOffer(offer)]}
        </Link>
      </p>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        {/* Image */}
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-line bg-surface-2">
          {offer.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={offer.imageUrl}
              alt={offer.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain p-8 mix-blend-multiply"
            />
          ) : (
            <span className="font-display text-7xl text-ink-soft/30">€</span>
          )}
          <div className="absolute left-4 top-4">
            <StoreBadge source={offer.source} />
          </div>
          <div className="absolute right-4 top-4 scale-125">
            <DiscountSticker
              label={mechanismDescription(offer).includes("gratis") ? "GRATIS" : "DEAL"}
            />
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col">
          {offer.brand ? (
            <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
              {offer.brand}
            </span>
          ) : null}
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {offer.title}
          </h1>

          <div className="mt-6 flex items-end gap-3">
            {pricing.currentPriceCents !== null ? (
              <span className="font-display text-5xl font-bold tabular-nums leading-none">
                {formatEuro(pricing.currentPriceCents)}
              </span>
            ) : (
              <span className="font-display text-3xl font-bold leading-none">
                {offer.rawLabel ?? "Actieprijs in de winkel"}
              </span>
            )}
            {pricing.originalPriceCents !== null ? (
              <span className="font-mono text-lg text-ink-soft line-through">
                {formatEuro(pricing.originalPriceCents)}
              </span>
            ) : null}
          </div>

          {pricing.savingsAbsoluteCents !== null ? (
            <span className="mt-3 w-fit rounded-md bg-fresh/10 px-2 py-1 font-mono text-xs font-bold text-fresh">
              je bespaart {formatEuro(pricing.savingsAbsoluteCents)}
              {pricing.savingsPercent !== null ? ` (${pricing.savingsPercent}%)` : ""}
            </span>
          ) : null}

          {isExVat(offer.source) ? (
            <p className="mt-3 w-fit rounded-md bg-ink/[0.06] px-2 py-1 font-mono text-xs font-bold text-ink-soft">
              Prijs is exclusief btw · groothandel
            </p>
          ) : null}

          <dl className="mt-8 space-y-3 border-t border-line pt-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="font-mono text-xs uppercase tracking-wide text-ink-soft">Actie</dt>
              <dd className="text-right">{mechanismDescription(offer)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-mono text-xs uppercase tracking-wide text-ink-soft">Geldig</dt>
              <dd className={`text-right font-mono ${soon ? "font-bold text-urgent" : ""}`}>
                {!offer.validUntil
                  ? `einddatum onbekend · ${freshnessLabel(offer.fetchedAt, nowIso)}`
                  : soon
                    ? days <= 1
                      ? "verloopt vandaag"
                      : `nog ${days} dagen`
                    : validUntilShort(offer.validUntil)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-mono text-xs uppercase tracking-wide text-ink-soft">Winkel</dt>
              <dd className="text-right">
                <Link href={`/winkel/${offer.source}`} className="underline-offset-2 hover:underline">
                  {store.name}
                </Link>
              </dd>
            </div>
            {/* Where the price comes from and how fresh it is — the question
                every price comparison should answer before being asked. */}
            <div className="flex justify-between gap-4">
              <dt className="font-mono text-xs uppercase tracking-wide text-ink-soft">Bron</dt>
              <dd className="text-right text-ink-soft">
                {provenanceLabel(offer)} · {freshnessLabel(offer.fetchedAt, nowIso)}
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {offer.url ? (
              <OutboundLink
                href={offer.url}
                store={offer.source}
                // "sponsored" only where it is true: an affiliate link earns a
                // commission, a link to the chain's own page does not.
                rel={
                  offer.provenance === "affiliate-feed"
                    ? "noopener noreferrer nofollow sponsored"
                    : "noopener noreferrer nofollow"
                }
                className="rounded-full px-6 py-3 text-center font-display text-sm font-bold shadow-sm transition-opacity hover:opacity-90"
                style={{ background: store.bg, color: store.fg }}
              >
                Bekijk bij {store.name} →
              </OutboundLink>
            ) : null}
            <AddToBasketButton id={offer.id} />
          </div>

          <div className="mt-4">
            <ShareOfferButton
              url={url}
              text={`${offer.title}${
                pricing.currentPriceCents !== null ? ` voor ${formatEuro(pricing.currentPriceCents)}` : ""
              } bij ${store.name}`}
            />
          </div>
          {offer.provenance === "affiliate-feed" ? (
            <p className="mt-3 text-xs leading-relaxed text-ink-soft">
              Deze link loopt via een partnerprogramma. Koop je iets, dan kan SuperScout een kleine
              vergoeding krijgen. Dat verandert niets aan de prijs of aan de volgorde op de site.
            </p>
          ) : null}

          <CataloguePermalink offer={offer} />
          <PriceHistoryNote offer={offer} />

          <div className="mt-6">
            <ReportOfferButton offerId={offer.id} />
          </div>
        </div>
      </div>

      <OfferProse offer={offer} alternatives={alternatives} category={category} />

      <RelatedSection title="Alternatieven bij andere winkels" offers={alternatives} nowIso={nowIso} />
      {offer.brand ? (
        <RelatedSection title={`Meer van ${offer.brand}`} offers={sameBrand} nowIso={nowIso} />
      ) : null}
      <RelatedSection title="Gerelateerde aanbiedingen" offers={related} nowIso={nowIso} />
    </div>
  );
}

/**
 * Link from a running promotion to the product's permanent page.
 *
 * Not a redirect. These offer pages sit at position 6-12 on long-tail product
 * queries and the catalogue pages are not indexed yet, so redirecting would
 * hand a working ranking to a page Google has never seen — a gamble with the
 * one thing that works. A link consolidates nothing on its own, but it costs
 * nothing either, and once the product pages actually rank the redirect becomes
 * a safe move made on evidence rather than hope.
 */
function CataloguePermalink({ offer }: { offer: Offer }) {
  const product = productForOffer(offer);
  if (!product) return null;

  return (
    <p className="mt-6 text-sm leading-relaxed text-ink-soft">
      <Link
        href={productPath(product)}
        className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
      >
        Bekijk de vaste prijs en prijshistorie van dit product
      </Link>{" "}
      — die pagina blijft bestaan, ook als deze actie is afgelopen.
    </p>
  );
}

/**
 * What the recorded price history says about this price.
 *
 * Renders nothing until there is enough history to make a real claim — the
 * page previously carried a "Prijsontwikkeling — binnenkort beschikbaar"
 * placeholder, and an empty promise is worse than silence. `insightFor`
 * returns null below three observations spanning two weeks.
 */
function PriceHistoryNote({ offer }: { offer: Offer }) {
  const insight = insightFor(offer);
  if (!insight) return null;

  const months = Math.max(1, Math.round(insight.spanDays / 30));
  const period = months === 1 ? "de afgelopen maand" : `de afgelopen ${months} maanden`;

  return (
    <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4">
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
        Prijsontwikkeling
      </p>
      <p className="mt-2 text-sm leading-relaxed">
        {insight.isLowestEver ? (
          <>
            <strong className="text-fresh">Laagste prijs die we hebben gemeten.</strong> In {period}{" "}
            zagen we dit product {insight.promotions}× in de aanbieding, tussen{" "}
            {formatEuro(insight.lowestCents)} en {formatEuro(insight.highestCents)}.
          </>
        ) : (
          <>
            In {period} zagen we dit {insight.promotions}× in de aanbieding, tussen{" "}
            {formatEuro(insight.lowestCents)} en {formatEuro(insight.highestCents)} — gemiddeld{" "}
            {formatEuro(insight.averageCents)}.{" "}
            {insight.belowAverage
              ? "Deze actie zit onder dat gemiddelde."
              : "Deze actie zit daar niet onder; wachten kan lonen."}
          </>
        )}
      </p>
    </div>
  );
}

/**
 * Unique prose per offer page.
 *
 * 1000+ detail pages that differ only in a title and a number read as thin
 * content to Google, which crawls them and then declines to index. Every
 * sentence here is composed from this offer's own data — the store, the actual
 * saving, the real cheapest alternative — so no two pages produce the same
 * paragraph, and the text is genuinely useful rather than keyword padding.
 */
function OfferProse({
  offer,
  alternatives,
  category,
}: {
  offer: Offer;
  alternatives: Offer[];
  category: CategorySlug;
}) {
  const store = STORE_META[offer.source].name;
  const { pricing } = offer;
  const label = CATEGORY_LABEL[category];


  // The cheapest priced alternative at a *different* chain, if there is one.
  const rival = alternatives
    .filter((o) => o.source !== offer.source && o.pricing.currentPriceCents !== null)
    .sort((a, b) => a.pricing.currentPriceCents! - b.pricing.currentPriceCents!)[0];

  const priceSentence =
    pricing.currentPriceCents !== null
      ? `Je betaalt ${formatEuro(pricing.currentPriceCents)}${
          pricing.originalPriceCents !== null
            ? `, tegen ${formatEuro(pricing.originalPriceCents)} buiten de actie`
            : ""
        }.`
      : `${store} noemt geen vaste actieprijs voor dit artikel; de korting wordt aan de kassa verrekend.`;

  const savingSentence =
    pricing.savingsAbsoluteCents !== null
      ? ` Dat scheelt ${formatEuro(pricing.savingsAbsoluteCents)}${
          pricing.savingsPercent !== null ? ` (${pricing.savingsPercent}%)` : ""
        } per stuk.`
      : "";

  return (
    <section className="mt-14 border-t border-line pt-10" aria-labelledby="over-heading">
      <h2 id="over-heading" className="font-display text-xl font-bold tracking-tight">
        Over deze aanbieding
      </h2>
      <div className="mt-4 max-w-3xl space-y-4 text-[15px] leading-relaxed text-ink-soft">
        <p>
          <strong className="font-semibold text-ink">{offer.title}</strong> staat deze week in de
          aanbieding bij {store}, in de categorie{" "}
          <Link
            href={`/categorie/${category}`}
            className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
          >
            {label.toLowerCase()}
          </Link>
          . {mechanismDescription(offer)} {priceSentence}
          {savingSentence}
          {/* ~1 in 3 offers arrives without an end date; an empty one would
              render "De actie loopt ." on hundreds of pages. */}
          {offer.validUntil ? ` De actie loopt ${validUntilShort(offer.validUntil)}.` : ""}
        </p>

        {rival ? (
          <p>
            Wil je vergelijken: {STORE_META[rival.source].name} heeft deze week{" "}
            <Link
              href={`/aanbieding/${offerSlug(rival)}`}
              className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
            >
              {rival.title}
            </Link>{" "}
            voor {formatEuro(rival.pricing.currentPriceCents)}
            {pricing.currentPriceCents !== null
              ? rival.pricing.currentPriceCents! < pricing.currentPriceCents
                ? " — dat is de goedkopere van de twee."
                : " — deze aanbieding bij " + store + " is dus voordeliger."
              : "."}
          </p>
        ) : null}

        <p>
          {sourceSentence(offer, store)}{" "}
          Controleer de definitieve prijs altijd in de winkel of de app van {store}; SuperScout
          verkoopt zelf niets
          {offer.provenance === "affiliate-feed" ? "" : " en verdient niets aan deze aanbieding"}. Meer{" "}
          <Link
            href={`/winkel/${offer.source}`}
            className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
          >
            {store} aanbiedingen
          </Link>{" "}
          vind je op de winkelpagina.
        </p>
      </div>
    </section>
  );
}

/** One honest sentence on where the price comes from, per kind of source. */
function sourceSentence(offer: Offer, store: string): string {
  switch (offer.provenance) {
    case "partner-feed":
      return `${store} levert deze aanbieding zelf aan; we werken hem bij zodra ${store} dat doet.`;
    case "affiliate-feed":
      return "Deze aanbieding komt uit de productfeed van een partnerprogramma en wordt dagelijks bijgewerkt.";
    case "manual":
      return `Deze aanbieding is met de hand overgenomen en voor het laatst gecontroleerd op ${new Date(offer.fetchedAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}.`;
    default:
      return `Prijzen en voorwaarden komen rechtstreeks van ${store} en worden dagelijks ververst.`;
  }
}

function RelatedSection({
  title,
  offers,
  nowIso,
}: {
  title: string;
  offers: Offer[];
  nowIso: string;
}) {
  if (offers.length === 0) return null;
  return (
    <section className="mt-14">
      <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {offers.slice(0, 8).map((o) => (
          <OfferCard key={o.id} offer={o} nowIso={nowIso} />
        ))}
      </div>
    </section>
  );
}
