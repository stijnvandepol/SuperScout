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

/**
 * The bundled snapshot, but only while it could still be true.
 *
 * `loadRaw` has two paths that reach for the seed — no OFFERS_PATH configured,
 * and the live file failing to parse — and both used to hand back the snapshot
 * unconditionally. That is how a July snapshot ended up on the site in
 * September as "aanbiedingen van deze week": 194 Aldi, 111 DekaMarkt, 35 Poiesz
 * offers, matching the seed exactly, all undated so `isActive` let them through.
 *
 * The age guard already existed on `mergeWithSeed`, which fills in a missing
 * chain. It did not exist here, on the path that replaces *everything*. An
 * empty site is a visible failure; a site quietly serving ten-week-old prices
 * is not, and for a price comparison that is the worse of the two.
 */
function usableSeed(): Offer[] {
  const age = (Date.now() - seedFreshness()) / 86_400_000;
  if (!Number.isFinite(age) || age > SEED_BACKFILL_MAX_AGE_DAYS) return [];
  return SEED;
}

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

/**
 * Offer ids an operator has pulled from the site.
 *
 * The moderation lever behind the "meld een fout" button: when a visitor
 * reports a price that is wrong, the fix at the source can take a day (the
 * next ingest) or longer (an adapter bug). Adding the id to this file hides it
 * within one cache window, without a deploy. A JSON array of offer ids, e.g.
 * `["kruidvat:123", "ah:456"]`. Applied to the live set and the archive alike,
 * so a hidden offer cannot resurface through its old URL.
 */
function blockedIds(): Set<string> {
  const path = process.env.OFFER_BLOCKLIST_PATH;
  if (!path) return new Set();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8")) as unknown;
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    // No file yet is the normal state; a broken one must not take the site down.
    return new Set();
  }
}

/** Drop unrenderable and blocked records, and say so once per load rather than per page. */
function sanitise(offers: Offer[], label: string): Offer[] {
  const blocked = blockedIds();
  const clean = offers.filter((o) => isRenderable(o) && !blocked.has(o.id));
  if (clean.length !== offers.length) {
    console.warn(`[offers] dropped ${offers.length - clean.length} unrenderable or blocked ${label} records`);
  }
  return clean;
}

/**
 * Read the live offer file, or the snapshot while it can still be true.
 *
 * Note what this returns during `docker build`: OFFERS_PATH is set by
 * docker-compose, not by the Dockerfile, and /data is a volume that does not
 * exist yet — so at build time there is no path, no file, and `usableSeed()`
 * is empty because the bundled snapshot is months old. Every page prerendered
 * in the image therefore says "0 aanbiedingen".
 *
 * That is why the offer-driven routes are `force-dynamic` rather than ISR.
 * With `revalidate` they shipped the build-time emptiness and kept serving it:
 * the container read this file perfectly (1.012 offers, all valid) while the
 * homepage showed zero, because nothing ever called this function again. The
 * routes generated on demand — category pages, product pages — were correct
 * the whole time, which is what finally located the fault at the build
 * boundary rather than in the data or the volume permissions.
 *
 * Rendering per request is affordable here because of the cache below: the
 * parse happens at most once a minute, and the rest is a filter over an array
 * already in memory.
 */
function loadRaw(): Offer[] {
  const path = process.env.OFFERS_PATH;
  if (!path) return usableSeed();

  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.offers;
  try {
    const parsed = sanitise(JSON.parse(readFileSync(path, "utf-8")) as Offer[], "offer");
    const offers = mergeWithSeed(parsed);
    cache = { at: now, offers };
    return offers;
  } catch (error) {
    // Loud, because this is the failure that hides: the site keeps serving and
    // nothing about the page says the data is two months old.
    console.error(`[offers] kon ${path} niet lezen:`, error);
    return cache?.offers ?? usableSeed();
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
