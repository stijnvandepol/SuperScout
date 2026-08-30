/**
 * Sligro states its folder period in prose and nowhere else.
 *
 * The page carries no validity field at all — the only ISO dates in it are
 * `lastMod` timestamps on product records, which say when Sligro last edited
 * the item, not how long the price holds. The period is written out for a human:
 *
 *   "Geldig van 13 t/m 31 augustus 2026"
 *   "Geldig van 30 augustus t/m 5 september 2026"
 *
 * Note the first form omits the opening month, because it is the same as the
 * closing one. Both are handled; anything else yields null rather than a guess,
 * since inventing a period is worse than admitting we have none.
 */

const MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maart: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  augustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  december: 12,
};

const PROSE =
  /geldig\s+van\s+(\d{1,2})(?:\s+([a-z]+))?\s*(?:t\/m|tot\s+en\s+met)\s*(\d{1,2})\s+([a-z]+)\s+(\d{4})/i;

export interface Period {
  validFrom: string;
  validUntil: string;
}

function iso(year: number, month: number, day: number, time: string): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${year}-${pad(month)}-${pad(day)}`;
  // Round-trip guard: rejects 31 februari and friends.
  if (new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) return null;
  return `${date}T${time}`;
}

/** The folder period as an inclusive ISO range, or null when the copy changed. */
export function parseSligroPeriod(text: string): Period | null {
  const m = PROSE.exec(text.replace(/\s+/g, " "));
  if (!m) return null;

  const startDay = Number.parseInt(m[1]!, 10);
  const endMonth = MONTHS[m[4]!.toLowerCase()];
  // The opening month is omitted when the period stays inside one month.
  const startMonth = m[2] ? MONTHS[m[2].toLowerCase()] : endMonth;
  const endDay = Number.parseInt(m[3]!, 10);
  const year = Number.parseInt(m[5]!, 10);
  if (!startMonth || !endMonth) return null;

  // A period crossing new year would read as an end month before the start one.
  const startYear = startMonth > endMonth ? year - 1 : year;

  const validFrom = iso(startYear, startMonth, startDay, "00:00:00.000Z");
  const validUntil = iso(year, endMonth, endDay, "23:59:00.000Z");
  if (!validFrom || !validUntil || validUntil < validFrom) return null;

  return { validFrom, validUntil };
}
