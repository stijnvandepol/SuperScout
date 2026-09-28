/**
 * DekaMarkt's promotion dates, which are not in the DOM.
 *
 * The cards carry a title and a price; the validity lives in the Nuxt payload
 * embedded as `<script id="__NUXT_DATA__">`. That payload is devalue-encoded: a
 * flat array where an object's field values are *indices* into the same array
 * rather than inline values.
 *
 *   {"headerText":564,"startDate":571,"endDate":572,"disclaimerEndDate":573,...}
 *
 * We deliberately do not implement a general devalue resolver. Three string
 * fields are three direct lookups, and a resolver would add cycle handling,
 * marker unwrapping and depth limits — branches that can each silently return
 * the wrong thing. A parser that reads exactly three fields can only fail in
 * three ways, and all three are visible.
 *
 * `endDate` is EXCLUSIVE: it marks midnight at the start of the day after the
 * promotion. Measured against the live page all 95 offers satisfied
 * `endDate - 1 day === disclaimerEndDate`, so two independent fields agree on
 * where the promotion actually ends.
 */

export interface Period {
  validFrom: string;
  validUntil: string;
}

export interface DekamarktValidity {
  /** Normalised offer title -> period, for titles that map unambiguously. */
  byTitle: Map<string, Period>;
  /**
   * The period shared by every offer in the payload, when there is only one.
   *
   * DekaMarkt runs a single folder week, so in practice all offers share a
   * period and no title join is needed at all. This is the fallback for offers
   * whose title the scraper renders differently from the payload.
   */
  common: Period | null;
}

/** Titles differ in case and spacing between the card and the payload. */
export function normaliseTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

const PAYLOAD = /id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/** Read a string at a payload index, unwrapping at most one reactive marker. */
function readString(flat: unknown[], index: unknown): string | null {
  if (typeof index !== "number" || index < 0 || index >= flat.length) return null;

  const node = flat[index];
  if (typeof node === "string") return node;
  // ["ShallowRef", 42] and friends wrap a single value.
  if (Array.isArray(node) && node.length === 2 && typeof node[0] === "string") {
    const inner = flat[node[1] as number];
    return typeof inner === "string" ? inner : null;
  }
  return null;
}

/** Shift a YYYY-MM-DD back by one day. */
function dayBefore(date: string): string | null {
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  return new Date(ms - 86_400_000).toISOString().slice(0, 10);
}

function toPeriod(start: string, exclusiveEnd: string): Period | null {
  const from = start.slice(0, 10);
  const lastDay = dayBefore(exclusiveEnd.slice(0, 10));
  if (!ISO_DATE.test(from) || !lastDay || lastDay < from) return null;

  return { validFrom: `${from}T00:00:00.000Z`, validUntil: `${lastDay}T23:59:00.000Z` };
}

export function parseDekamarktValidity(html: string): DekamarktValidity {
  const empty: DekamarktValidity = { byTitle: new Map(), common: null };

  const match = PAYLOAD.exec(html);
  if (!match) return empty;

  let flat: unknown[];
  try {
    const parsed: unknown = JSON.parse(match[1]!);
    if (!Array.isArray(parsed)) return empty;
    flat = parsed;
  } catch {
    return empty;
  }

  const byTitle = new Map<string, Period>();
  const ambiguous = new Set<string>();
  const distinct = new Set<string>();
  let single: Period | null = null;

  for (const node of flat) {
    if (typeof node !== "object" || node === null || Array.isArray(node)) continue;
    const record = node as Record<string, unknown>;
    if (!("headerText" in record) || !("startDate" in record) || !("endDate" in record)) continue;

    const title = readString(flat, record.headerText);
    const start = readString(flat, record.startDate);
    const end = readString(flat, record.endDate);
    if (!title || !start || !end) continue;

    const period = toPeriod(start, end);
    if (!period) continue;

    const key = `${period.validFrom}|${period.validUntil}`;
    distinct.add(key);
    single = period;

    const name = normaliseTitle(title);
    const seen = byTitle.get(name);
    if (seen && (seen.validFrom !== period.validFrom || seen.validUntil !== period.validUntil)) {
      // The same title under two different periods cannot be joined safely.
      ambiguous.add(name);
    } else {
      byTitle.set(name, period);
    }
  }

  for (const name of ambiguous) byTitle.delete(name);

  return { byTitle, common: distinct.size === 1 ? single : null };
}
