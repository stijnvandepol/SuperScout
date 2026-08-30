import { readFileSync } from "node:fs";
import type { Offer, OfferStatus } from "@superscout/core";
import {
  CATEGORIES,
  categorizeOffer,
  isActive,
  offerStatus,
  priceKey,
  SUPERMARKETS,
  type CategorySlug,
} from "@superscout/core";
import { offerSlug } from "@/lib/format";
import seed from "@/data/offers.json";

// Bundled snapshot — the fallback when no live data file is mounted.
const SEED = seed as unknown as Offer[];

// Importing node:fs makes this module server-only: a client component that
// imports it fails the build loudly, which is the guard we want.
const TTL_MS = 60_000;
let cache: { at: number; offers: Offer[] } | null = null;

/**
 * How old the bundled snapshot may be before it stops standing in for a chain.
 *
 * A supermarket promotion runs a week, so a snapshot older than two weeks
 * cannot contain a single valid price.
 */
const SEED_BACKFILL_MAX_AGE_DAYS = 14;

/** Newest ingestion timestamp in the bundled snapshot, as epoch ms. */
function seedFreshness(): number {
  let newest = Number.NEGATIVE_INFINITY;
  for (const offer of SEED) {
    const at = Date.parse(offer.fetchedAt);
    if (!Number.isNaN(at) && at > newest) newest = at;
  }
  return newest;
}

/**
 * Backfill chains that are missing from the live file with the bundled seed.
 *
 * The ingestion worker skips browser-driven chains (Plus/Lidl/Aldi/Hoogvliet)
 * if Chromium can't start in the container, and the snapshot keeps a dev or
 * fresh-deploy environment usable before the first ingest lands.
 *
 * Strictly age-limited, because the unguarded version shipped six-week-old
 * prices to production as this week's deals. Three individually reasonable
 * decisions combined into it: the DekaMarkt adapter stopped producing, this
 * function filled the gap from the July snapshot, and every one of those 111
 * records carries an empty `validUntil` — which `isActive` deliberately fails
 * open on, so nothing downstream could catch it. The result was a page headed
 * "DekaMarkt aanbiedingen deze week" listing prices from 8 July.
 *
 * For a price comparison site a missing chain is a gap; a wrong price is a lie.
 * So the backfill now only applies while the snapshot itself is recent enough
 * to contain a live promotion.
 */
function mergeWithSeed(live: Offer[]): Offer[] {
  const age = (Date.now() - seedFreshness()) / 86_400_000;
  if (!Number.isFinite(age) || age > SEED_BACKFILL_MAX_AGE_DAYS) return live;

  const liveSources = new Set(live.map((o) => o.source));
  const fill = SEED.filter((o) => !liveSources.has(o.source));
  return fill.length ? [...live, ...fill] : live;
}

/**
 * The trust boundary between ingested JSON and the render tree.
 *
 * `JSON.parse(...) as Offer[]` is a cast, not a check — nothing enforces the
 * type once data crosses that line. The UI, meanwhile, is full of code that
 * assumes it holds: `mechanismDescription()` is an exhaustive switch over the
 * mechanism union, so a record carrying a type the union does not know falls
 * through to `undefined`, and the caller's `.includes("gratis")` throws a
 * TypeError mid-render — a 500, not a 404. Search Console was reporting 18 of
 * those against 626 healthy pages, which is the signature of bad records rather
 * than bad code.
 *
 * So the boundary drops what it cannot render, rather than letting each
 * component defend itself. A quarantined offer is invisible; a crashing one
 * takes the response with it.
 */
const RENDERABLE_MECHANISMS = new Set([
  "percentage_off",
  "amount_off",
  "buy_x_get_y_free",
  "multi_buy",
  "free_delivery",
  "cashback",
  "nth_discounted",
  "price_drop",
  "unknown",
]);

function isRenderable(offer: Offer): boolean {
  return (
    typeof offer?.id === "string" &&
    typeof offer.title === "string" &&
    offer.title.length > 0 &&
    typeof offer.sourceOfferId === "string" &&
    offer.source in SUPERMARKETS &&
    offer.pricing !== null &&
    typeof offer.pricing === "object" &&
    RENDERABLE_MECHANISMS.has(offer.mechanism?.type)
  );
}

/** Drop unrenderable records, and say so once per load rather than per page. */
function sanitise(offers: Offer[], label: string): Offer[] {
  const clean = offers.filter(isRenderable);
  if (clean.length !== offers.length) {
    console.warn(`[offers] dropped ${offers.length - clean.length} unrenderable ${label} records`);
  }
  return clean;
}

function loadRaw(): Offer[] {
  const path = process.env.OFFERS_PATH;
  if (!path) return SEED;

  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.offers;
  try {
    const parsed = sanitise(JSON.parse(readFileSync(path, "utf-8")) as Offer[], "offer");
    const offers = mergeWithSeed(parsed);
    cache = { at: now, offers };
    return offers;
  } catch {
    return cache?.offers ?? SEED;
  }
}

/**
 * All offers valid today. Reads the live file at OFFERS_PATH (written by the
 * ingestion worker) when set, else the bundled seed, then drops anything not
 * currently valid (stale seed / next-week deals).
 */
export function getOffers(): Offer[] {
  const nowIso = new Date().toISOString();
  return loadRaw().filter((o) => isActive(o.validFrom, o.validUntil, nowIso));
}

/**
 * When the live set was last fetched — one value for the whole page.
 *
 * Every offer in a pull shares its `fetchedAt`, so this is passed down as a
 * single string instead of a field on each card. That matters: `CardOffer`
 * exists to keep the client payload small, and putting `fetchedAt` back on 849
 * offers would cost ~40 KB to say the same thing 849 times.
 */
export function dataFetchedAt(): string | null {
  let newest: string | null = null;
  for (const offer of getOffers()) {
    if (!newest || offer.fetchedAt > newest) newest = offer.fetchedAt;
  }
  return newest;
}

export function getBySlug(slug: string): Offer | undefined {
  return getOffers().find((o) => offerSlug(o) === slug);
}

/* ------------------------------------------------------------------ *
 * Archive — the cold path.
 *
 * Deliberately a second file with its own, longer-lived cache. The live set is
 * ~850 offers and is parsed on every listing render; the archive holds every
 * promotion of the last 120 days (tens of thousands) and is only touched when
 * somebody actually asks for an expired URL. Merging the two would put a
 * multi-megabyte JSON.parse on the homepage's hot path for data almost nobody
 * requests.
 * ------------------------------------------------------------------ */

const ARCHIVE_TTL_MS = 300_000;
let archiveCache: { at: number; offers: Offer[] } | null = null;

/**
 * Every promotion retained by the ingestion worker: running, upcoming and
 * expired. Empty until the worker has completed a pass — callers must treat an
 * empty archive as normal rather than as an error.
 */
export function getArchivedOffers(): Offer[] {
  const path = process.env.ARCHIVE_PATH;
  if (!path) return [];

  const now = Date.now();
  if (archiveCache && now - archiveCache.at < ARCHIVE_TTL_MS) return archiveCache.offers;

  try {
    const offers = sanitise(JSON.parse(readFileSync(path, "utf-8")) as Offer[], "archive");
    archiveCache = { at: now, offers };
    return offers;
  } catch {
    return archiveCache?.offers ?? [];
  }
}

export interface ResolvedOffer {
  offer: Offer;
  status: OfferStatus;
}

/**
 * Resolve a slug against the live set first, then the archive.
 *
 * This is what stops the weekly 404 wave: a URL published in July still
 * resolves in August, marked `expired`, instead of telling Google the page
 * never existed. Live wins on a tie so a re-running promotion always renders
 * from the freshest copy.
 */
export function resolveBySlug(slug: string): ResolvedOffer | undefined {
  const live = getBySlug(slug);
  if (live) return { offer: live, status: "active" };

  const archived = getArchivedOffers().find((o) => offerSlug(o) === slug);
  if (!archived) return undefined;

  return { offer: archived, status: offerStatus(archived, new Date().toISOString()) };
}

/**
 * The same product, on offer right now.
 *
 * Keyed on `priceKey` (chain + normalised title) rather than the offer id,
 * because ids are per-promotion and change every week — the whole reason the
 * old URLs were disposable. The same chain wins over a rival, since "it is back
 * on offer where you were looking" is the more useful answer.
 */
export function currentEquivalent(offer: Offer): Offer | undefined {
  const key = priceKey(offer);
  if (!key) return undefined;

  const name = key.slice(key.indexOf("|") + 1);
  const matches = getOffers().filter((o) => {
    const other = priceKey(o);
    return other !== null && other.slice(other.indexOf("|") + 1) === name;
  });

  return matches.find((o) => o.source === offer.source) ?? matches[0];
}

/** Promotions that have been published but have not started yet. */
export function upcomingOffers(): Offer[] {
  const nowIso = new Date().toISOString();
  return getArchivedOffers().filter((o) => offerStatus(o, nowIso) === "upcoming");
}

export function offersInCategory(slug: string): Offer[] {
  return getOffers().filter((o) => categorizeOffer(o) === slug);
}

export function stats(offers: Offer[]): { total: number; stores: number } {
  return { total: offers.length, stores: new Set(offers.map((o) => o.source)).size };
}

export function byBiggestDiscount(offers: Offer[]): Offer[] {
  return [...offers].sort(
    (a, b) => (b.pricing.savingsPercent ?? 0) - (a.pricing.savingsPercent ?? 0),
  );
}

export interface CategorySummary {
  slug: CategorySlug;
  label: string;
  count: number;
}

/**
 * Below this an own category page is thinner than it is useful.
 *
 * A page with two products reads as thin content to search engines and as a
 * dead end to shoppers. Such categories drop out of the index pages, the
 * footer and the sitemap; the page itself still resolves (an existing link
 * must not 404) but tells crawlers not to index it.
 */
export const MIN_CATEGORY_OFFERS = 5;

/** Whether a category is substantial enough to link to and index. */
export function isIndexableCategory(count: number): boolean {
  return count >= MIN_CATEGORY_OFFERS;
}

/** Categories worth linking to, in taxonomy order, with counts. */
export function categoriesPresent(): CategorySummary[] {
  return allCategoriesPresent().filter((c) => isIndexableCategory(c.count));
}

/** Every category with at least one offer, including the thin ones. */
export function allCategoriesPresent(): CategorySummary[] {
  const counts = new Map<CategorySlug, number>();
  for (const offer of getOffers()) {
    const slug = categorizeOffer(offer);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return CATEGORIES.filter((c) => counts.has(c.slug)).map((c) => ({
    slug: c.slug,
    label: c.label,
    count: counts.get(c.slug) ?? 0,
  }));
}
