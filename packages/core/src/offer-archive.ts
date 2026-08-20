import type { Offer } from "./offer";
import { isExpired } from "./offer-period";

/**
 * Keeping expired promotions instead of deleting them.
 *
 * SuperScout used to write only today's valid offers to disk, so every URL the
 * site had ever published died the moment its promotion ended. Search Console
 * measured the result exactly: 848 "not found (404)" against 626 indexed pages,
 * and 875 URLs stuck in "discovered — currently not indexed". Google had
 * learned the host publishes disposable URLs and stopped spending crawl budget
 * on it, which capped the whole site regardless of how good any single page was.
 *
 * The offer pages were the ones actually ranking — position 6-12 on long-tail
 * product queries like "brabantia melkopschuimer dirk" — so the weekly rollover
 * was demolishing the only thing that worked. Retaining them turns a wasting
 * asset into an accumulating one: an expired promotion still answers "what did
 * this cost, how often is it on offer, and where can I get it now".
 */

/**
 * How long an expired promotion stays served.
 *
 * Four months covers a full quarter of price history, which is the span at
 * which `priceInsight` starts producing statements worth reading, while keeping
 * the archive file in the low tens of MB rather than growing without bound.
 */
export const ARCHIVE_RETENTION_DAYS = 120;

const MS_PER_DAY = 86_400_000;

/**
 * When an offer stopped being relevant, in epoch ms.
 *
 * Prefers the promotion's own end date, but roughly a third of ingested offers
 * arrive with no usable `validUntil`, so `fetchedAt` is the fallback — it is
 * written by our own worker and therefore always present and parseable. An
 * offer we cannot date at all is treated as maximally old and pruned, rather
 * than pinned in the archive forever.
 */
function relevanceEnd(offer: Offer): number {
  const end = offer.validUntil ? Date.parse(offer.validUntil) : Number.NaN;
  if (!Number.isNaN(end)) return end;

  const fetched = Date.parse(offer.fetchedAt);
  return Number.isNaN(fetched) ? Number.NEGATIVE_INFINITY : fetched;
}

/**
 * Fold a fresh ingestion pass into the retained archive.
 *
 * Keyed on `id` (`${source}:${sourceOfferId}`), with the incoming copy winning:
 * a promotion that is still running is re-ingested daily, and the archive must
 * reflect the latest price the chain published rather than the first one we
 * happened to see. Anything whose relevance ended more than `retentionDays` ago
 * is dropped.
 *
 * Ordering is stable and deterministic — newest relevance first — so the
 * written file only changes when the data does.
 */
export function mergeArchive(
  previous: Offer[],
  incoming: Offer[],
  nowIso: string,
  retentionDays: number = ARCHIVE_RETENTION_DAYS,
): Offer[] {
  const now = Date.parse(nowIso);
  const cutoff = Number.isNaN(now) ? Number.NEGATIVE_INFINITY : now - retentionDays * MS_PER_DAY;

  const byId = new Map<string, Offer>();
  for (const offer of previous) byId.set(offer.id, offer);
  for (const offer of incoming) byId.set(offer.id, offer);

  return [...byId.values()]
    .filter((offer) => relevanceEnd(offer) >= cutoff)
    .sort((a, b) => relevanceEnd(b) - relevanceEnd(a) || a.id.localeCompare(b.id));
}

/** Where an archived offer sits relative to today. */
export type OfferStatus = "active" | "upcoming" | "expired";

export function offerStatus(offer: Offer, nowIso: string): OfferStatus {
  if (isExpired(offer.validUntil, nowIso)) return "expired";

  const start = offer.validFrom ? Date.parse(offer.validFrom) : Number.NaN;
  const now = Date.parse(nowIso);
  if (!Number.isNaN(start) && !Number.isNaN(now) && now < start) return "upcoming";

  return "active";
}

/** Whole days since the promotion ended; 0 when it has not. */
export function daysSinceExpiry(offer: Offer, nowIso: string): number {
  const end = relevanceEnd(offer);
  const now = Date.parse(nowIso);
  if (Number.isNaN(now) || end === Number.NEGATIVE_INFINITY) return 0;
  return Math.max(0, Math.floor((now - end) / MS_PER_DAY));
}
