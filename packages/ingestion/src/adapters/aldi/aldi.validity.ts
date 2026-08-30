/**
 * Aldi's promotion dates, which are not in the DOM.
 *
 * The product tiles carry a price and a discount badge but no validity, so the
 * adapter used to emit every Aldi offer with an empty `validFrom`/`validUntil`.
 * That was 215 of 215 offers — and site-wide 47% of the set — arriving with no
 * validity at all, which meant nothing downstream could say whether a deal still
 * ran, the "bijna verlopen" filter skipped them, and the card rendered a blank
 * where the end date belongs.
 *
 * The dates are on the page, just not in the markup: aldi.nl embeds a second,
 * escaped JSON blob carrying `promotionPrices` per product, keyed by the same
 * numeric `objectID` the tile's product URL already gives us.
 *
 *   "promotionPrices":[{ "validFrom":1787522400, "validUntil":1788127199,
 *     "priceValue":4.99, "validFromLocalDate":"2026-08-24",
 *     "validUntilLocalDate":"2026-08-30" }], "objectID":"1200809"
 *
 * Parsed here rather than inside `page.evaluate` so it is a pure function with
 * a real fixture behind it. This is the part that silently breaks when Aldi
 * reshapes their page, and a scraper that fails silently is exactly how the
 * missing dates went unnoticed in the first place.
 */

export interface AldiValidity {
  /** Calendar date, YYYY-MM-DD. */
  validFrom: string;
  validUntil: string;
}

/** Dates precede their product's `objectID` inside the same JSON object. */
const DATE_PAIR =
  /"validFromLocalDate":"(\d{4}-\d{2}-\d{2})","validUntilLocalDate":"(\d{4}-\d{2}-\d{2})"/g;
const OBJECT_ID = /"objectID":"(\d+)"/g;

/**
 * Map product id -> promotion period, read from the page's own JSON.
 *
 * Walks both patterns in document order and pairs each `objectID` with the date
 * pair immediately before it, then clears the pending pair. A product with no
 * promotion of its own therefore gets nothing rather than inheriting its
 * neighbour's dates — silently borrowing a date would be worse than having none.
 */
export function parseAldiValidity(html: string): Map<string, AldiValidity> {
  // The blob is JSON inside JSON, so its quotes arrive backslash-escaped.
  const text = html.includes('\\"') ? html.replace(/\\"/g, '"') : html;

  type Mark = { at: number; kind: "dates" | "id"; a: string; b?: string };
  const marks: Mark[] = [];

  DATE_PAIR.lastIndex = 0;
  for (let m = DATE_PAIR.exec(text); m; m = DATE_PAIR.exec(text)) {
    marks.push({ at: m.index, kind: "dates", a: m[1]!, b: m[2]! });
  }
  OBJECT_ID.lastIndex = 0;
  for (let m = OBJECT_ID.exec(text); m; m = OBJECT_ID.exec(text)) {
    marks.push({ at: m.index, kind: "id", a: m[1]! });
  }
  marks.sort((x, y) => x.at - y.at);

  const out = new Map<string, AldiValidity>();
  let pending: AldiValidity | null = null;

  for (const mark of marks) {
    if (mark.kind === "dates") {
      pending = { validFrom: mark.a, validUntil: mark.b! };
    } else if (pending) {
      // First write wins: the same product can be repeated later in the page
      // (recommendation rails), and the first occurrence is the offer listing.
      if (!out.has(mark.a)) out.set(mark.a, pending);
      pending = null;
    }
  }

  return out;
}

/** End-of-day ISO for a calendar date, matching how the other chains publish. */
export function toIsoRange(v: AldiValidity): { validFrom: string; validUntil: string } {
  return {
    validFrom: `${v.validFrom}T00:00:00.000Z`,
    validUntil: `${v.validUntil}T23:59:00.000Z`,
  };
}
