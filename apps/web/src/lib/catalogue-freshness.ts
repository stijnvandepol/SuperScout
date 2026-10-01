/**
 * How much a catalogue price can still claim, given when it was fetched.
 *
 * The catalogue crawl is nightly when it works, but a chain can drop out for
 * weeks: Albert Heijn's robots.txt paused it, and the crawl stops at whatever
 * it last saw. Every product page kept saying "kost op dit moment" and "haalt
 * dagelijks op" regardless, and kept handing Google a Product price it renders
 * under the blue link as today's. A 40.000-page section asserting prices we
 * stopped checking is a misrepresentation risk for the whole site, not just
 * those pages.
 *
 * Three states, each giving up one more claim:
 *
 *   current  the price is recent enough to state as today's, with markup
 *   dated    still shown, but as the last known price with its date, and no
 *            Product markup — Google would present it as current
 *   expired  as dated, and also noindex and out of the sitemap: a page whose
 *            only fact is a month-old price is not worth a searcher's click
 *
 * Kept free of `node:sqlite` so it is testable and importable anywhere.
 */

export type PriceFreshness = "current" | "dated" | "expired";

/** A week covers one missed crawl cycle at any chain without crying wolf. */
export const PRICE_MARKUP_MAX_AGE_DAYS = 7;

/** Past this, the page has nothing left to say that a searcher needs. */
export const INDEXABLE_MAX_AGE_DAYS = 30;

const DAY_MS = 86_400_000;

export function priceFreshness(fetchedAt: string, now: Date = new Date()): PriceFreshness {
  const fetched = Date.parse(fetchedAt);
  // An unreadable timestamp is a price we cannot date, so it claims nothing.
  if (Number.isNaN(fetched)) return "expired";

  const ageDays = (now.getTime() - fetched) / DAY_MS;
  if (ageDays <= PRICE_MARKUP_MAX_AGE_DAYS) return "current";
  if (ageDays <= INDEXABLE_MAX_AGE_DAYS) return "dated";
  return "expired";
}

/**
 * The oldest `fetched_at` a sitemap may still list, as an ISO string.
 *
 * ISO-8601 in UTC sorts lexically in time order, which is what lets the
 * catalogue compare it against the stored column without parsing every row.
 *
 * Truncated to the UTC day: the sitemap index is computed per request while
 * its chunks are cached for a day, and a cutoff moving by the millisecond would
 * let the two disagree about where a chunk starts.
 */
export function indexableSince(now: Date = new Date()): string {
  const cutoff = new Date(now.getTime() - INDEXABLE_MAX_AGE_DAYS * DAY_MS);
  cutoff.setUTCHours(0, 0, 0, 0);
  return cutoff.toISOString();
}
