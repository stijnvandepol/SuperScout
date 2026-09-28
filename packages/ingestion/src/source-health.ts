import type { Offer } from "@superscout/core";
import { isActive } from "@superscout/core";

/**
 * Is this chain's pull believable, compared with its recent history?
 *
 * The runner already isolates a chain that throws. The failure it cannot see
 * is the quiet one: Aldi returned 211 offers one run and 0 twenty minutes
 * later, twice in a week, without an error — the page loaded, the tiles were
 * not there. The chain then simply vanished from the site until the next good
 * run. A price comparison that loses a chain for a day because one page load
 * misbehaved is less trustworthy than one that says "these are yesterday's
 * offers, still running".
 *
 * So each run's count is compared with the chain's own recent runs. A zero, or
 * less than half the usual number, is treated like a failure: a warning, a
 * snapshot of the page, and the previous offers kept instead of an empty slot.
 */

/** One run's offer count per source, appended to the history file. */
export interface RunCounts {
  at: string;
  counts: Record<string, number>;
}

export interface HealthOptions {
  /** How far back "usual" looks. */
  windowDays?: number;
  /** Below this share of the median, a count is suspicious. */
  minShare?: number;
  /** A median needs this many earlier good runs before it means anything. */
  minRuns?: number;
}

export type Verdict = { ok: true } | { ok: false; reason: string };

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

/** Judge one source's count against its own history. Pure, for testing. */
export function assessCount(
  source: string,
  count: number,
  history: RunCounts[],
  nowIso: string,
  { windowDays = 14, minShare = 0.5, minRuns = 3 }: HealthOptions = {},
): Verdict {
  const since = Date.parse(nowIso) - windowDays * 86_400_000;
  const earlier = history
    .filter((run) => Date.parse(run.at) >= since)
    .map((run) => run.counts[source])
    .filter((n): n is number => typeof n === "number" && n > 0);

  // Nothing to compare with: a new chain, or one that has never worked.
  if (earlier.length === 0) return { ok: true };

  const usual = median(earlier);
  if (count === 0) return { ok: false, reason: `0 aanbiedingen, normaal rond ${usual}` };
  if (earlier.length >= minRuns && count < usual * minShare) {
    return { ok: false, reason: `${count} aanbiedingen, normaal rond ${usual}` };
  }
  return { ok: true };
}

/** Held offers are yesterday's data; after this long they are not worth showing. */
export const HOLD_MAX_DAYS = 7;

/**
 * The previous run's offers for a source that are still worth showing today:
 * still running, and fetched recently enough to vouch for.
 */
export function heldOffers(previous: Offer[], source: string, nowIso: string): Offer[] {
  const cutoff = Date.parse(nowIso) - HOLD_MAX_DAYS * 86_400_000;
  return previous.filter(
    (o) =>
      o.source === source &&
      Date.parse(o.fetchedAt) >= cutoff &&
      // Undated offers pass `isActive` forever; the fetchedAt cutoff bounds them.
      isActive(o.validFrom, o.validUntil, nowIso),
  );
}

/** Parse the JSONL history, skipping lines a crash may have left half-written. */
export function parseHistory(text: string): RunCounts[] {
  return text
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const run = JSON.parse(line) as RunCounts;
        return typeof run.at === "string" && run.counts ? [run] : [];
      } catch {
        return [];
      }
    });
}
