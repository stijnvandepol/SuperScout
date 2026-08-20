import type { Offer } from "./offer";

/**
 * Which day of the week a chain starts a new promotion cycle.
 *
 * SuperScout deliberately never hardcodes this (see offer-period.ts) — chains
 * change their cycle and a hardcoded table quietly goes wrong. But a page that
 * answers "when do next week's offers appear" needs the answer, so it is
 * derived from the offers themselves: the weekday most `validFrom` dates fall
 * on. That is self-maintaining, and it is honest about not knowing.
 */

export const WEEKDAY_NL = [
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
  "zondag",
] as const;

/** Minimum samples before a weekday count means anything. */
const MIN_SAMPLES = 5;

/**
 * Share of starts that must agree before we call it a cycle.
 *
 * Several chains run a weekly cycle *and* a separate weekend cycle (Dirk starts
 * on Wednesday but also on Sunday), so the dominant day is real without being
 * unanimous. Below this the chain has no single cycle worth stating and we say
 * nothing rather than pick the largest pile.
 */
const MIN_DOMINANCE = 0.55;

export interface CycleStart {
  /** 0 = Monday … 6 = Sunday. */
  weekday: number;
  label: (typeof WEEKDAY_NL)[number];
  /** Fraction of dated offers that start on this weekday. */
  share: number;
}

/**
 * The chain's promotion start day, or null when the data does not support one.
 *
 * Roughly a third of ingested offers carry no usable date; those simply do not
 * vote. Parsed as UTC so the answer does not shift with the server's timezone.
 */
export function cycleStart(offers: Offer[]): CycleStart | null {
  const counts = new Array<number>(7).fill(0);
  let dated = 0;

  for (const offer of offers) {
    if (!offer.validFrom || offer.validFrom.length < 10) continue;
    const parsed = Date.parse(`${offer.validFrom.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(parsed)) continue;

    // getUTCDay is Sunday-first; shift to Monday-first to match WEEKDAY_NL.
    const weekday = (new Date(parsed).getUTCDay() + 6) % 7;
    counts[weekday]! += 1;
    dated += 1;
  }

  if (dated < MIN_SAMPLES) return null;

  let weekday = 0;
  for (let i = 1; i < 7; i += 1) if (counts[i]! > counts[weekday]!) weekday = i;

  const share = counts[weekday]! / dated;
  if (share < MIN_DOMINANCE) return null;

  return { weekday, label: WEEKDAY_NL[weekday]!, share };
}

/** Per-chain cycle starts, skipping chains whose data does not support one. */
export function cycleStartsBySource(offers: Offer[]): Map<string, CycleStart> {
  const grouped = new Map<string, Offer[]>();
  for (const offer of offers) {
    const list = grouped.get(offer.source);
    if (list) list.push(offer);
    else grouped.set(offer.source, [offer]);
  }

  const starts = new Map<string, CycleStart>();
  for (const [source, list] of grouped) {
    const start = cycleStart(list);
    if (start) starts.set(source, start);
  }
  return starts;
}
