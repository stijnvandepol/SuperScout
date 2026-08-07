import type { Offer } from "./offer";

/**
 * Recording what things cost, so that in six months we can say whether €2,99
 * is actually a good price.
 *
 * The hard part is identity. Offer ids are per *promotion* and change every
 * week, and no chain in the set publishes EANs, so there is nothing stable to
 * key on except the chain plus the product's own name. Measured against a full
 * snapshot that collides for ~1% of products (a "Coca-Cola" listed twice in
 * different pack sizes), which is the accuracy ceiling this data allows. Same
 * key on the same day keeps the lowest price seen, so a collision reports the
 * best advertised price for that name rather than an arbitrary one.
 */

export interface PriceObservation {
  /** `${source}|${normalised title}` — see priceKey. */
  key: string;
  /** Calendar date, YYYY-MM-DD. One observation per key per day. */
  date: string;
  priceCents: number;
}

/** Normalise a title into something that survives week-to-week rewording. */
function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    // Chains prefix "Alle" on brand-wide promos in some weeks and not others.
    .replace(/^alle\s+/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Stable-ish product identity across weeks. Empty when the title is unusable. */
export function priceKey(offer: Offer): string | null {
  const name = normaliseTitle(offer.title);
  if (name.length < 3) return null;
  return `${offer.source}|${name}`;
}

/**
 * Today's observations from a snapshot: one per product, lowest price wins.
 * Offers without a price contribute nothing — a promotion with no number is
 * not a price point.
 */
export function observationsFrom(offers: Offer[], dateIso: string): PriceObservation[] {
  const date = dateIso.slice(0, 10);
  const lowest = new Map<string, number>();

  for (const offer of offers) {
    const price = offer.pricing.currentPriceCents;
    if (price === null || price <= 0) continue;

    const key = priceKey(offer);
    if (!key) continue;

    const seen = lowest.get(key);
    if (seen === undefined || price < seen) lowest.set(key, price);
  }

  return [...lowest.entries()]
    .map(([key, priceCents]) => ({ key, date, priceCents }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Observations not already recorded for that key+date.
 *
 * Makes a re-run idempotent: the ingest worker can run twice in a day, or be
 * restarted mid-write, without doubling the history or shifting any average.
 */
export function newObservations(
  existing: PriceObservation[],
  incoming: PriceObservation[],
): PriceObservation[] {
  const seen = new Set(existing.map((o) => `${o.key}@${o.date}`));
  return incoming.filter((o) => !seen.has(`${o.key}@${o.date}`));
}

/** Group observations per product, oldest first. */
export function buildSeries(observations: PriceObservation[]): Map<string, PriceObservation[]> {
  const series = new Map<string, PriceObservation[]>();
  for (const observation of observations) {
    const list = series.get(observation.key);
    if (list) list.push(observation);
    else series.set(observation.key, [observation]);
  }
  for (const list of series.values()) {
    list.sort((a, b) => a.date.localeCompare(b.date));
  }
  return series;
}

export interface PriceInsight {
  /**
   * How many separate promotions we have seen, not how many days.
   *
   * The worker samples daily, so a one-week promo produces seven observations.
   * Counting those as seven would tell a shopper a product goes on offer every
   * week when it ran once, so consecutive days collapse into one promotion and
   * a gap starts a new one.
   */
  promotions: number;
  /** Distinct days this product was seen on offer at all. */
  daysSeen: number;
  /** Days between the first and last observation. */
  spanDays: number;
  lowestCents: number;
  highestCents: number;
  /** The current price matches the lowest ever recorded. */
  isLowestEver: boolean;
  /** The current price beats the average of everything recorded. */
  belowAverage: boolean;
  averageCents: number;
}

/**
 * Minimum history before an insight means anything.
 *
 * Two observations a day apart can make any price look like a record low.
 * Below this the honest answer is to say nothing at all, which is why callers
 * get null rather than a shrug.
 */
const MIN_OBSERVATIONS = 3;
const MIN_SPAN_DAYS = 14;

const MS_PER_DAY = 86_400_000;

/**
 * Distinct promotion runs in a date-sorted series: consecutive days belong to
 * the same promotion, any gap starts a new one.
 */
function countPromotions(sorted: PriceObservation[]): number {
  let runs = 0;
  let previous: number | null = null;

  for (const observation of sorted) {
    const day = Date.parse(`${observation.date}T00:00:00Z`);
    if (Number.isNaN(day)) continue;
    // Same day (a duplicate) neither extends nor starts a run.
    if (previous === null || day - previous > MS_PER_DAY) runs++;
    previous = day;
  }

  return runs;
}

export function priceInsight(
  observations: PriceObservation[],
  currentPriceCents: number | null,
  options: { minObservations?: number; minSpanDays?: number } = {},
): PriceInsight | null {
  const { minObservations = MIN_OBSERVATIONS, minSpanDays = MIN_SPAN_DAYS } = options;

  if (currentPriceCents === null || currentPriceCents <= 0) return null;
  if (observations.length < minObservations) return null;

  const sorted = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  const first = Date.parse(`${sorted[0]!.date}T00:00:00Z`);
  const last = Date.parse(`${sorted.at(-1)!.date}T00:00:00Z`);
  if (Number.isNaN(first) || Number.isNaN(last)) return null;

  const spanDays = Math.round((last - first) / MS_PER_DAY);
  if (spanDays < minSpanDays) return null;

  const prices = sorted.map((o) => o.priceCents);
  const lowestCents = Math.min(...prices);
  const highestCents = Math.max(...prices);
  const averageCents = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);

  return {
    promotions: countPromotions(sorted),
    daysSeen: new Set(sorted.map((o) => o.date)).size,
    spanDays,
    lowestCents,
    highestCents,
    isLowestEver: currentPriceCents <= lowestCents,
    belowAverage: currentPriceCents < averageCents,
    averageCents,
  };
}

/* ---------- Storage format ---------- */

/**
 * One observation per line, short keys.
 *
 * JSONL rather than a single JSON document because the writer only ever
 * appends: a crash mid-write costs the last line instead of the whole file,
 * and nothing has to be re-serialised as the history grows.
 */
export function serialiseObservations(observations: PriceObservation[]): string {
  return observations.map((o) => JSON.stringify({ k: o.key, d: o.date, p: o.priceCents })).join("\n");
}

/** Parse a JSONL history. Unreadable lines are skipped, never fatal. */
export function parseObservations(jsonl: string): PriceObservation[] {
  const out: PriceObservation[] = [];

  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const row = JSON.parse(trimmed) as { k?: unknown; d?: unknown; p?: unknown };
      if (typeof row.k !== "string" || typeof row.d !== "string" || typeof row.p !== "number") {
        continue;
      }
      out.push({ key: row.k, date: row.d, priceCents: row.p });
    } catch {
      // A truncated final line from an interrupted append is expected; the rest
      // of the history is still perfectly usable.
    }
  }

  return out;
}
