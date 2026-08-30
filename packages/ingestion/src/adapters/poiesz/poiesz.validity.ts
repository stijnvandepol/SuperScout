/**
 * Poiesz publishes one folder period for the whole page.
 *
 * Every offer in the payload points at the same two indices, so unlike Aldi
 * there is nothing per-product to join — one period covers the lot. The values
 * sit right after the object that references them in the flattened Nuxt payload:
 *
 *   {"validFrom":2181,"validUntil":2182,"categories":2183},
 *   "2026-08-30T00:00:00","2026-09-06T00:00:00",[2184,...
 *
 * The end date is EXCLUSIVE. The payload above pairs with page copy reading
 * "Geldig van 30 augustus tot en met 5 september 2026" — so 09-06T00:00 marks
 * the start of the day after the promotion, not its last day. Taking it at face
 * value would quietly run every Poiesz offer a day long, which is the kind of
 * error that only surfaces months later as "why is this still listed".
 */

const PERIOD =
  /\{"validFrom":\d+,"validUntil":\d+,"categories":\d+\},"(\d{4}-\d{2}-\d{2})T[^"]*","(\d{4}-\d{2}-\d{2})T[^"]*"/;

export interface Period {
  validFrom: string;
  validUntil: string;
}

/** Shift a YYYY-MM-DD back by one day. */
function dayBefore(date: string): string | null {
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  return new Date(ms - 86_400_000).toISOString().slice(0, 10);
}

/** The folder period as an inclusive ISO range, or null when the page changed. */
export function parsePoieszPeriod(html: string): Period | null {
  const m = PERIOD.exec(html);
  if (!m) return null;

  const start = m[1]!;
  const lastDay = dayBefore(m[2]!);
  if (!lastDay || lastDay < start) return null;

  return {
    validFrom: `${start}T00:00:00.000Z`,
    validUntil: `${lastDay}T23:59:00.000Z`,
  };
}
