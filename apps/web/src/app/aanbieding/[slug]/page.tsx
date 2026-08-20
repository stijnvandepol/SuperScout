import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Offer } from "@superscout/core";
import {
  CATEGORY_LABEL,
  type CategorySlug,
  categorizeOffer,
  daysSinceExpiry,
  daysUntilExpiry,
  isExpiringSoon,
  relatedOffers,
} from "@superscout/core";
import { currentEquivalent, getOffers, resolveBySlug } from "@/lib/offers";
import { insightFor } from "@/lib/price-history";

import {
  formatEuro,
  isExVat,
  mechanismDescription,
  offerSlug,
  STORE_META,
  validUntilShort,
} from "@/lib/format";
import { OfferCard } from "@/components/OfferCard";
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

/**
 * Whether an expired page earns a place in the index.
 *
 * Keeping the URL alive (200 instead of 404) is what repairs crawl trust, but
 * that is a separate question from whether the page deserves to be indexed. An
 * archived promotion is worth indexing when it can say something no other site
 * can: a recorded price history, or the fact that the product is on offer again
 * right now. With neither, it is a page about a price that no longer applies —
 * served, linked and crawlable, but `noindex` so it does not dilute the site
 * with thousands of near-identical entries.
 */
function archiveHasSubstance(offer: Offer): boolean {
  return insightFor(offer) !== null || currentEquivalent(offer) !== undefined;
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

  if (status === "expired") {
    const current = currentEquivalent(offer);
    const forPrice = priced ? ` voor ${priceAmount}` : "";
    // The title leads with the archive's actual proposition ("prijs en
    // historie") rather than pretending the deal is live — a searcher who
    // clicks a stale price and finds an ended promotion bounces, and Google
    // reads that bounce.
    const title = `${offer.title} bij ${store} — prijs en actiehistorie`;
    const description = current
      ? `${offer.title} was in de aanbieding bij ${store}${forPrice}. Deze actie is afgelopen — bekijk wat het product nu kost en bij welke supermarkt het deze week in de actie staat.`
      : `${offer.title} was in de aanbieding bij ${store}${forPrice}. Deze actie is afgelopen. Bekijk de prijsontwikkeling en de aanbiedingen die er nu wél zijn.`;

    return {
      title,
      description,
      alternates: { canonical },
      robots: archiveHasSubstance(offer)
        ? undefined
        : { index: false, follow: true, googleBot: { index: false, follow: true } },
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

  const upcoming = status === "upcoming";
  const title = `${offer.title}${price} bij ${store} — SuperScout`;
  const description = upcoming
    ? `${offer.title} gaat in de aanbieding bij ${store}. ${mechanismDescription(offer)} Geldig vanaf ${validUntilShort(offer.validFrom)}.`
    : `${offer.title} in de aanbieding bij ${store}. ${mechanismDescription(offer)} Geldig ${validUntilShort(offer.validUntil)}.`;

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
  const expired = status === "expired";
  const current = expired ? currentEquivalent(offer) : undefined;

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
      <JsonLd data={productJsonLd(offer, url, { expired })} />
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

      {expired ? <ExpiredBanner offer={offer} current={current} nowIso={nowIso} /> : null}

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        {/* Image */}
        <div
          className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-line bg-surface-2 ${
            expired ? "opacity-60 saturate-50" : ""
          }`}
        >
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
            {expired ? null : (
              <DiscountSticker
                label={mechanismDescription(offer).includes("gratis") ? "GRATIS" : "DEAL"}
              />
            )}
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

          {expired ? (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
              Actieprijs destijds
            </p>
          ) : null}

          <div className={`flex items-end gap-3 ${expired ? "mt-1" : "mt-6"}`}>
            {pricing.currentPriceCents !== null ? (
              <span
                className={`font-display text-5xl font-bold tabular-nums leading-none ${
                  expired ? "text-ink-soft" : ""
                }`}
              >
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
            <span
              className={`mt-3 w-fit rounded-md px-2 py-1 font-mono text-xs font-bold ${
                expired ? "bg-ink/[0.06] text-ink-soft" : "bg-fresh/10 text-fresh"
              }`}
            >
              {expired ? "bespaarde toen" : "je bespaart"}{" "}
              {formatEuro(pricing.savingsAbsoluteCents)}
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
              <dt className="font-mono text-xs uppercase tracking-wide text-ink-soft">
                {expired ? "Liep tot" : "Geldig"}
              </dt>
              <dd
                className={`text-right font-mono ${expired ? "text-ink-soft" : soon ? "font-bold text-urgent" : ""}`}
              >
                {expired
                  ? longDate(offer.validUntil)
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
          </dl>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {/* A finished promotion's deep link is dead at the chain too, so an
                expired page sends people to the store's live offers instead of
                to a 404 we do not control. */}
            {expired ? (
              <Link
                href={`/winkel/${offer.source}`}
                className="rounded-full px-6 py-3 text-center font-display text-sm font-bold shadow-sm transition-opacity hover:opacity-90"
                style={{ background: store.bg, color: store.fg }}
              >
                {store.name} aanbiedingen van nu →
              </Link>
            ) : (
              <>
                {offer.url ? (
                  <a
                    href={offer.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow sponsored"
                    className="rounded-full px-6 py-3 text-center font-display text-sm font-bold shadow-sm transition-opacity hover:opacity-90"
                    style={{ background: store.bg, color: store.fg }}
                  >
                    Bekijk bij {store.name} →
                  </a>
                ) : null}
                <AddToBasketButton id={offer.id} />
              </>
            )}
          </div>

          <PriceHistoryNote offer={offer} expired={expired} />
        </div>
      </div>

      <OfferProse
        offer={offer}
        alternatives={alternatives}
        category={category}
        expired={expired}
        current={current}
        nowIso={nowIso}
      />

      {/* `relatedOffers` runs against the *live* set, so on an archived page
          these sections are the answer to "fine, but what can I buy now" — the
          reason an expired URL is worth keeping rather than 410-ing. */}
      <RelatedSection
        title={expired ? "Deze week wél in de aanbieding" : "Alternatieven bij andere winkels"}
        offers={alternatives}
        nowIso={nowIso}
      />
      {offer.brand ? (
        <RelatedSection
          title={expired ? `${offer.brand} in de aanbieding deze week` : `Meer van ${offer.brand}`}
          offers={sameBrand}
          nowIso={nowIso}
        />
      ) : null}
      <RelatedSection
        title={expired ? "Vergelijkbare aanbiedingen van nu" : "Gerelateerde aanbiedingen"}
        offers={related}
        nowIso={nowIso}
      />
    </div>
  );
}

/** "2026-07-12" -> "12 juli 2026". Falls back to the raw value if unparseable. */
function longDate(iso: string): string {
  const parsed = Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(parsed)) return iso;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(parsed));
}

/**
 * The header an expired page leads with.
 *
 * States plainly that the promotion is over — a visitor who has to work that
 * out from a greyed-out price bounces, and Google reads the bounce — and then
 * immediately gives them the one thing they came for: where this product is on
 * offer today. Without that second half the page is an apology, and an archive
 * full of apologies deserves the 410 it would otherwise get.
 */
function ExpiredBanner({
  offer,
  current,
  nowIso,
}: {
  offer: Offer;
  current: Offer | undefined;
  nowIso: string;
}) {
  const days = daysSinceExpiry(offer, nowIso);
  // `validUntilShort` renders "t/m 12-07", which reads as nonsense after "op".
  // Past this window a full date is more use than a day count anyway.
  const ago =
    days <= 1 ? "gisteren" : days < 14 ? `${days} dagen geleden` : `op ${longDate(offer.validUntil)}`;

  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface-2 p-5">
      <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-urgent">
        Actie afgelopen
      </p>
      <p className="mt-2 text-[15px] leading-relaxed">
        Deze aanbieding bij {STORE_META[offer.source].name} is {ago} geëindigd. De prijs hieronder
        is wat het product tóén in de actie kostte — geen actuele prijs.
      </p>

      {current ? (
        <p className="mt-4 text-[15px] leading-relaxed">
          <strong className="font-semibold">Goed nieuws:</strong>{" "}
          <Link
            href={`/aanbieding/${offerSlug(current)}`}
            className="font-medium underline decoration-deal decoration-2 underline-offset-2"
          >
            {current.title}
          </Link>{" "}
          staat nu in de aanbieding bij {STORE_META[current.source].name}
          {current.pricing.currentPriceCents !== null
            ? ` voor ${formatEuro(current.pricing.currentPriceCents)}`
            : ""}
          .
        </p>
      ) : (
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          Dit product staat op dit moment bij geen enkele supermarkt in de aanbieding. Hieronder
          staan de acties die er deze week wél zijn.
        </p>
      )}
    </div>
  );
}

/**
 * What the recorded price history says about this price.
 *
 * Renders nothing until there is enough history to make a real claim — the
 * page previously carried a "Prijsontwikkeling — binnenkort beschikbaar"
 * placeholder, and an empty promise is worse than silence. `insightFor`
 * returns null below three observations spanning two weeks.
 *
 * On an archived page this is the single strongest reason the URL still exists:
 * "was €12,99 the good price?" is a question no folder site answers.
 */
function PriceHistoryNote({ offer, expired }: { offer: Offer; expired: boolean }) {
  const insight = insightFor(offer);
  if (!insight) return null;

  const months = Math.max(1, Math.round(insight.spanDays / 30));
  const period = months === 1 ? "de afgelopen maand" : `de afgelopen ${months} maanden`;

  if (expired) {
    return (
      <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
          Prijsontwikkeling
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          In {period} zagen we dit product {insight.promotions}× in de aanbieding, tussen{" "}
          {formatEuro(insight.lowestCents)} en {formatEuro(insight.highestCents)} — gemiddeld{" "}
          {formatEuro(insight.averageCents)}.{" "}
          {insight.isLowestEver
            ? "Deze afgelopen actie was de laagste prijs die we hebben gemeten."
            : `Wacht je op een vergelijkbare actie, dan is ${formatEuro(insight.lowestCents)} het scherpste dat we tot nu toe zagen.`}
        </p>
      </div>
    );
  }

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
  expired,
  current,
  nowIso,
}: {
  offer: Offer;
  alternatives: Offer[];
  category: CategorySlug;
  expired: boolean;
  current: Offer | undefined;
  nowIso: string;
}) {
  const store = STORE_META[offer.source].name;
  const { pricing } = offer;
  const label = CATEGORY_LABEL[category];

  if (expired) {
    return (
      <ArchiveProse
        offer={offer}
        current={current}
        category={category}
        alternatives={alternatives}
        nowIso={nowIso}
      />
    );
  }

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
          Prijzen en voorwaarden komen rechtstreeks van {store} en worden dagelijks ververst.
          Controleer de definitieve prijs altijd in de winkel of de app van {store}; SuperScout
          verkoopt zelf niets en verdient niets aan deze aanbieding. Meer{" "}
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

/**
 * The prose an archived page carries instead of the live sales copy.
 *
 * Written entirely in the past tense and built from this promotion's own
 * numbers, so it reads as a record rather than as an ad that forgot to expire.
 * Three things justify the URL staying alive, and each gets a paragraph: what
 * the deal actually was, whether the product is on offer again, and what the
 * measured price range says about whether that price was any good.
 */
function ArchiveProse({
  offer,
  current,
  category,
  alternatives,
  nowIso,
}: {
  offer: Offer;
  current: Offer | undefined;
  category: CategorySlug;
  alternatives: Offer[];
  nowIso: string;
}) {
  const store = STORE_META[offer.source].name;
  const label = CATEGORY_LABEL[category];
  const { pricing } = offer;
  const insight = insightFor(offer);
  const days = daysSinceExpiry(offer, nowIso);

  const priceSentence =
    pricing.currentPriceCents !== null
      ? `De actieprijs was ${formatEuro(pricing.currentPriceCents)}${
          pricing.originalPriceCents !== null
            ? `, tegen ${formatEuro(pricing.originalPriceCents)} buiten de actie`
            : ""
        }.`
      : `${store} noemde geen vaste actieprijs; de korting werd aan de kassa verrekend.`;

  // `mechanismDescription` renders a price_drop as "Nu €2,49" — present tense,
  // and the same number `priceSentence` is about to give in the past tense.
  // Every other mechanism adds information the price alone does not carry.
  const mechanism = offer.mechanism.type === "price_drop" ? "" : `${mechanismDescription(offer)} `;

  return (
    <section className="mt-14 border-t border-line pt-10" aria-labelledby="over-heading">
      <h2 id="over-heading" className="font-display text-xl font-bold tracking-tight">
        Over deze afgelopen aanbieding
      </h2>
      <div className="mt-4 max-w-3xl space-y-4 text-[15px] leading-relaxed text-ink-soft">
        <p>
          <strong className="font-semibold text-ink">{offer.title}</strong> stond bij {store} in de
          aanbieding in de categorie{" "}
          <Link
            href={`/categorie/${category}`}
            className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
          >
            {label.toLowerCase()}
          </Link>
          . {mechanism}
          {priceSentence}
          {offer.validUntil ? ` De actie liep tot ${longDate(offer.validUntil)}` : ""}
          {offer.validUntil && days > 0 ? ` — ${days} dagen geleden.` : offer.validUntil ? "." : ""}
        </p>

        {current ? (
          <p>
            Het product staat nu opnieuw in de actie:{" "}
            <Link
              href={`/aanbieding/${offerSlug(current)}`}
              className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
            >
              {current.title}
            </Link>{" "}
            bij {STORE_META[current.source].name}
            {current.pricing.currentPriceCents !== null
              ? ` voor ${formatEuro(current.pricing.currentPriceCents)}`
              : ""}
            {current.pricing.currentPriceCents !== null && pricing.currentPriceCents !== null
              ? current.pricing.currentPriceCents < pricing.currentPriceCents
                ? " — scherper dan de actie hierboven."
                : current.pricing.currentPriceCents > pricing.currentPriceCents
                  ? " — iets duurder dan de actie hierboven."
                  : " — precies dezelfde prijs als toen."
              : "."}
          </p>
        ) : alternatives.length > 0 ? (
          <p>
            Dit exacte product staat deze week nergens in de aanbieding, maar er{" "}
            {alternatives.length === 1
              ? "loopt 1 vergelijkbare actie"
              : `lopen ${alternatives.length} vergelijkbare acties`}{" "}
            in dezelfde categorie. Die {alternatives.length === 1 ? "staat" : "staan"} hieronder, of
            bekijk alle{" "}
            <Link
              href={`/categorie/${category}`}
              className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
            >
              {label.toLowerCase()}-aanbiedingen
            </Link>{" "}
            van deze week.
          </p>
        ) : null}

        {insight ? (
          <p>
            SuperScout meet de actieprijzen van {store} dagelijks. Voor dit product zagen we{" "}
            {insight.promotions} {insight.promotions === 1 ? "actie" : "acties"} over{" "}
            {insight.daysSeen} dagen, met {formatEuro(insight.lowestCents)} als laagste en{" "}
            {formatEuro(insight.highestCents)} als hoogste actieprijs. Zo kun je bij een volgende
            actie zien of de korting echt bijzonder is.
          </p>
        ) : (
          <p>
            SuperScout bewaart afgelopen acties zodat je kunt terugzoeken wat een product eerder
            kostte. Hoe langer we {store} volgen, hoe beter je kunt beoordelen of een korting echt
            een korting is. Alle actuele{" "}
            <Link
              href={`/winkel/${offer.source}`}
              className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
            >
              {store} aanbiedingen
            </Link>{" "}
            staan op de winkelpagina.
          </p>
        )}
      </div>
    </section>
  );
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
