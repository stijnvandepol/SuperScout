import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Offer } from "@superscout/core";
import {
  CATEGORY_LABEL,
  categorizeOffer,
  priceKey,
  productPath,
  relatedOffers,
} from "@superscout/core";
import { productForOffer } from "@/lib/catalogue";
import { getOffers } from "@/lib/offers";
import { insightFor } from "@/lib/price-history";
import { type PricePage, pricePage, promotionCount } from "@/lib/price-pages";
import {
  formatEuro,
  mechanismDescription,
  offerSlug,
  STORE_META,
  stickerLabel,
} from "@/lib/format";
import { OfferCard } from "@/components/OfferCard";
import { OutboundLink } from "@/components/OutboundLink";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, productJsonLd, SITE_URL } from "@/lib/seo";

/**
 * The durable page for one product at one chain — see `lib/price-pages.ts`.
 *
 * Per request, not ISR: a 404 rendered while the data volume is still empty
 * after a deploy would otherwise be cached for the whole revalidate window,
 * which is exactly how the deal-type pages once 404'd for Googlebot. The data
 * behind it is cached in memory, so this costs a map lookup.
 */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ chain: string; slug: string }> };

/** "12 aug" — UTC, so the date never shifts with the server's timezone. */
function day(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** The period a promotion ran, as honestly as its data allows. */
function period(offer: Offer): string {
  if (offer.validFrom && offer.validUntil) return `${day(offer.validFrom)} t/m ${day(offer.validUntil)}`;
  if (offer.validUntil) return `t/m ${day(offer.validUntil)}`;
  // Five chains publish no dates; when we last saw it is the true statement.
  return `gezien op ${day(offer.fetchedAt)}`;
}

function priceText(offer: Offer): string | null {
  return offer.pricing.currentPriceCents !== null ? formatEuro(offer.pricing.currentPriceCents) : null;
}

/**
 * What the deal was, in the words a shopper uses: "was €3,99", "1+1 gratis".
 *
 * Null rather than the card sticker's generic "DEAL", which says nothing a
 * reader can use; a row with only a date and a price is clearer than a row
 * with a word that means "something".
 */
function dealText(offer: Offer): string | null {
  if (offer.pricing.originalPriceCents !== null) return `was ${formatEuro(offer.pricing.originalPriceCents)}`;
  if (offer.pricing.savingsPercent !== null) return `${offer.pricing.savingsPercent}% korting`;
  const label = stickerLabel(offer);
  return label === "DEAL" ? null : label;
}

function resolve(chain: string, slug: string): PricePage | undefined {
  if (!(chain in STORE_META)) return undefined;
  return pricePage(chain, slug);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { chain, slug } = await params;
  const page = resolve(chain, slug);
  if (!page) return { title: "Product niet gevonden" };

  const { latest } = page;
  const store = STORE_META[page.chain].name;
  const canonical = `/prijs/${page.chain}/${page.slug}`;
  const live = page.live[0];
  const price = live ? priceText(live) : null;

  // The queries this page exists for are product names, often with the chain
  // ("dirk ventilator"). The title answers the question behind them first:
  // is it on offer, and for how much.
  const title = live
    ? `${latest.title} in de aanbieding bij ${store}${price ? ` — ${price}` : ""}`
    : `${latest.title} bij ${store}: aanbieding en prijs`;

  const lastPrice = priceText(latest);
  const description = live
    ? `${latest.title} is nu in de aanbieding bij ${store}. ${mechanismDescription(live)}${live.validUntil ? ` Geldig t/m ${day(live.validUntil)}.` : ""} Bekijk ook hoe vaak het in de actie is.`
    : page.upcoming[0]
      ? `${latest.title} komt in de aanbieding bij ${store}${page.upcoming[0].validFrom ? ` vanaf ${day(page.upcoming[0].validFrom)}` : ""}. Bekijk eerdere acties en wat er nu al in de aanbieding is.`
      : `${latest.title} is nu niet in de aanbieding bij ${store}. Laatst ${period(latest)}${lastPrice ? ` voor ${lastPrice}` : ""}. Bekijk hoe vaak het terugkomt en wat er nu wél in de aanbieding is.`;

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
      images: latest.imageUrl ? [latest.imageUrl] : [],
    },
  };
}

export default async function PricePageRoute({ params }: Params) {
  const { chain, slug } = await params;
  const page = resolve(chain, slug);
  if (!page) notFound();

  const { latest } = page;

  // Albert Heijn and Jumbo have a catalogue page that exists whether or not
  // the product was ever on offer. One product, one address: that one wins.
  const catalogued = productForOffer(latest);
  if (catalogued) permanentRedirect(productPath(catalogued));

  const nowIso = new Date().toISOString();
  const store = STORE_META[page.chain];
  const canonical = `/prijs/${page.chain}/${page.slug}`;
  const category = categorizeOffer(latest);
  const live = page.live[0];
  const upcoming = page.upcoming[0];
  const elsewhere = onOfferNow(page);
  const insight = insightFor(latest);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      {/* Product markup needs a price that holds today; without a running
          promotion there is none to state, and an offer-less Product node is
          an error in Search Console. */}
      {live ? <JsonLd data={productJsonLd(live, `${SITE_URL}${canonical}`)} /> : null}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: store.name, path: `/winkel/${page.chain}` },
          { name: CATEGORY_LABEL[category], path: `/categorie/${category}` },
          { name: latest.title, path: canonical },
        ])}
      />

      <p className="pt-6 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
        <Link href={`/winkel/${page.chain}`} className="hover:text-ink">
          {store.name}
        </Link>
        {" · "}
        <Link href={`/categorie/${category}`} className="hover:text-ink">
          {CATEGORY_LABEL[category]}
        </Link>
      </p>

      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-8">
        {/* Small on a phone: the answer ("is it on offer?") must be on the
            first screen, not below a full-width product photo. */}
        <div className="flex aspect-square w-36 items-center justify-center overflow-hidden rounded-3xl border border-line bg-surface-2 sm:w-48 md:w-full">
          {latest.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={latest.imageUrl}
              alt={latest.title}
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain p-4 mix-blend-multiply md:p-8"
            />
          ) : (
            <span className="font-display text-5xl text-ink-soft/30 md:text-7xl">€</span>
          )}
        </div>

        <div className="flex flex-col">
          {latest.brand ? (
            <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
              {latest.brand}
            </span>
          ) : null}
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {latest.title} bij {store.name}
          </h1>

          <StatusCard page={page} live={live} upcoming={upcoming} storeName={store.name} />

          {live?.url ? (
            <OutboundLink
              href={live.url}
              store={live.source}
              rel="noopener noreferrer nofollow"
              className="mt-6 w-fit rounded-full px-6 py-3 text-center font-display text-sm font-bold shadow-sm transition-opacity hover:opacity-90"
              style={{ background: store.bg, color: store.fg }}
            >
              Bekijk bij {store.name} →
            </OutboundLink>
          ) : null}

          {insight ? (
            <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4">
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
                Is dit een goede prijs?
              </p>
              <p className="mt-2 text-sm leading-relaxed">
                We zagen dit {insight.promotions}× in de aanbieding bij {store.name}, tussen{" "}
                {formatEuro(insight.lowestCents)} en {formatEuro(insight.highestCents)}. Gemiddeld
                was het {formatEuro(insight.averageCents)}.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* What can be bought now comes before what used to be on offer: a page
          that only reported the past was the dead end this route replaces. */}
      {!live && elsewhere.offers.length > 0 ? (
        <OfferRail
          title={
            elsewhere.sameProduct
              ? "Nu in de aanbieding bij een andere winkel"
              : "Dit is nu wél in de aanbieding"
          }
          offers={elsewhere.offers}
          nowIso={nowIso}
        />
      ) : null}

      <History page={page} storeName={store.name} />

      <Prose page={page} storeName={store.name} />

      {live && elsewhere.offers.length > 0 ? (
        <OfferRail title="Vergelijk met andere winkels" offers={elsewhere.offers} nowIso={nowIso} />
      ) : null}
    </div>
  );
}

/** The normalised-name half of a priceKey, for "same product" comparisons. */
function keyName(offer: Offer): string {
  const key = priceKey(offer);
  return key ? key.slice(key.indexOf("|") + 1) : "";
}

/**
 * Offers running now that answer "where do I get this, or something like it".
 *
 * The same product at another chain first — that is the exact answer — then
 * the keyword alternatives `relatedOffers` already computes for offer pages.
 */
function onOfferNow(page: PricePage): { offers: Offer[]; sameProduct: boolean } {
  const live = getOffers();
  const name = keyName(page.latest);
  const ownIds = new Set(page.live.map((o) => o.id));

  const sameProduct = live.filter(
    (o) => !ownIds.has(o.id) && o.source !== page.chain && name !== "" && keyName(o) === name,
  );
  const { alternatives, related } = relatedOffers(page.latest, live);

  const seen = new Set<string>();
  const result: Offer[] = [];
  for (const offer of [...sameProduct, ...alternatives, ...related]) {
    if (ownIds.has(offer.id) || seen.has(offer.id)) continue;
    seen.add(offer.id);
    result.push(offer);
    if (result.length === 8) break;
  }
  return { offers: result, sameProduct: sameProduct.length > 0 };
}

function StatusCard({
  page,
  live,
  upcoming,
  storeName,
}: {
  page: PricePage;
  live: Offer | undefined;
  upcoming: Offer | undefined;
  storeName: string;
}) {
  if (live) {
    const price = priceText(live);
    return (
      <div className="mt-6 rounded-2xl border-2 border-fresh/40 bg-fresh/5 p-5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-fresh">
          Nu in de aanbieding
        </p>
        <p className="mt-2 font-display text-4xl font-bold tabular-nums leading-none">
          {price ?? stickerLabel(live)}
          {live.pricing.originalPriceCents !== null ? (
            <span className="ml-3 font-mono text-lg font-normal text-ink-soft line-through">
              {formatEuro(live.pricing.originalPriceCents)}
            </span>
          ) : null}
        </p>
        <p className="mt-3 text-[15px] leading-relaxed">
          {mechanismDescription(live)} {live.validUntil ? `Geldig t/m ${day(live.validUntil)}.` : ""}
        </p>
        <Link
          href={`/aanbieding/${offerSlug(live)}`}
          className="mt-3 inline-block font-medium underline decoration-deal decoration-2 underline-offset-2"
        >
          Bekijk de actie en zet hem in je mandje
        </Link>
      </div>
    );
  }

  if (upcoming) {
    return (
      <div className="mt-6 rounded-2xl border border-line bg-surface-2 p-5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink-soft">
          Binnenkort in de aanbieding
        </p>
        <p className="mt-2 text-[15px] leading-relaxed">
          {mechanismDescription(upcoming)} Vanaf {upcoming.validFrom ? day(upcoming.validFrom) : "binnenkort"}{" "}
          bij {storeName}.
        </p>
      </div>
    );
  }

  const last = page.past[0];
  const lastPrice = last ? priceText(last) : null;
  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface-2 p-5">
      <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink-soft">
        Nu niet in de aanbieding
      </p>
      {last ? (
        <p className="mt-2 text-[15px] leading-relaxed">
          Laatst in de aanbieding {period(last).startsWith("gezien") ? "" : "van "}
          {period(last)}
          {lastPrice ? (
            <>
              {" "}
              voor <strong className="font-semibold">{lastPrice}</strong>
            </>
          ) : null}
          {dealText(last) ? ` (${dealText(last)})` : ""}.
        </p>
      ) : null}
    </div>
  );
}

function History({ page, storeName }: { page: PricePage; storeName: string }) {
  const rows = [...page.upcoming, ...page.live, ...page.past].slice(0, 12);
  if (rows.length < 2 && page.live.length > 0) return null;

  return (
    <section className="mt-14">
      <h2 className="font-display text-xl font-bold tracking-tight">
        Wanneer was dit in de aanbieding bij {storeName}?
      </h2>
      {/* A list, not a table: three columns did not fit a phone and pushed
          the price — the one number that matters — off screen. */}
      <ul className="mt-5 divide-y divide-line rounded-2xl border border-line">
        {rows.map((offer) => (
          <li key={offer.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <span className="text-[15px]">
              {period(offer)}
              {page.live.includes(offer) ? (
                <span className="ml-2 font-mono text-xs font-bold text-fresh">nu</span>
              ) : null}
            </span>
            <span className="text-right">
              <span className="block font-display text-lg font-bold tabular-nums">
                {priceText(offer) ?? stickerLabel(offer)}
              </span>
              {dealText(offer) && priceText(offer) ? (
                <span className="block font-mono text-xs text-ink-soft">{dealText(offer)}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Prose composed from this product's own record.
 *
 * Thousands of these pages differing only in a name would read as thin
 * content; every sentence here comes from data only this product has — how
 * often it came back, the range it sold for, when it last ran.
 */
function Prose({ page, storeName }: { page: PricePage; storeName: string }) {
  const { latest } = page;
  const count = promotionCount(page);
  const prices = [...page.live, ...page.upcoming, ...page.past]
    .map((o) => o.pricing.currentPriceCents)
    .filter((c): c is number => c !== null);
  const low = prices.length > 0 ? Math.min(...prices) : null;
  const high = prices.length > 0 ? Math.max(...prices) : null;
  const oldest = page.past.at(-1);

  return (
    <section className="mt-14 border-t border-line pt-10">
      <h2 className="font-display text-xl font-bold tracking-tight">
        Hoe vaak is {latest.title} in de aanbieding bij {storeName}?
      </h2>
      <div className="mt-4 max-w-3xl space-y-4 text-[15px] leading-relaxed text-ink-soft">
        <p>
          {count === 1
            ? `SuperScout heeft ${latest.title} één keer in de aanbieding gezien bij ${storeName}`
            : `SuperScout heeft ${latest.title} ${count} keer in de aanbieding gezien bij ${storeName}`}
          {oldest ? `, voor het eerst ${period(oldest).replace(/^gezien op /, "op ")}` : ""}.
          {low !== null && high !== null
            ? low === high
              ? ` De actieprijs was steeds ${formatEuro(low)}.`
              : ` De actieprijs lag tussen ${formatEuro(low)} en ${formatEuro(high)}.`
            : ""}{" "}
          {page.live.length > 0
            ? "Op dit moment loopt er een actie; die staat hierboven."
            : `Op dit moment loopt er geen actie. Supermarkten herhalen hun acties vaak, dus deze pagina toont de volgende zodra ${storeName} hem publiceert.`}
        </p>
        <p>
          SuperScout haalt de aanbiedingen elke ochtend rechtstreeks bij {storeName} op en bewaart
          ze vier maanden, zodat je kunt zien of een korting echt scherp is. Controleer de
          definitieve prijs altijd in de winkel of de app van {storeName}; SuperScout verkoopt zelf
          niets. Alle actuele acties staan op de pagina met{" "}
          <Link
            href={`/winkel/${page.chain}`}
            className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
          >
            {storeName} aanbiedingen
          </Link>
          .
        </p>
      </div>
    </section>
  );
}

function OfferRail({ title, offers, nowIso }: { title: string; offers: Offer[]; nowIso: string }) {
  return (
    <section className="mt-14">
      <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {offers.map((o) => (
          <OfferCard key={o.id} offer={o} nowIso={nowIso} />
        ))}
      </div>
    </section>
  );
}
