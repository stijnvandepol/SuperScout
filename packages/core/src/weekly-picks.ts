import type { Offer } from "./offer";
import type { SupermarketSlug } from "./supermarket";
import { daysUntilExpiry, isActive } from "./offer-period";

/**
 * Selecting the week's most postable deals.
 *
 * Sorting by raw discount percentage produces a useless list: it fills up with
 * non-food clearance, "gratis bezorging" mechanics, placeholder titles like
 * "OP=OP", and four entries from whichever chain happens to run a clearance
 * that week. What a reader actually wants is a handful of recognisable
 * products, spread across chains, that are still worth acting on tomorrow.
 */

/** Titles that are section headers or filler rather than a product. */
const NON_PRODUCT_TITLES = [
  /^op=op$/i,
  /^bbq$/i,
  /^zomerdeals?$/i,
  /^winterdeals?$/i,
  /^festival/i,
  /^alle\s*$/i,
  /^diversen$/i,
  /^overig$/i,
  /gratis bezorging/i,
  /^extra online/i,
  /^online only:?\s*$/i,
];

/** A deal needs at least this many days left to be worth posting about. */
const MIN_DAYS_LEFT = 2;

/** Cap per chain, so one clearance week cannot take over the whole list. */
const MAX_PER_STORE = 2;

/**
 * The discount as a single comparable percentage.
 *
 * Chains express the same saving in incompatible ways, so each mechanism is
 * converted to "percent off per unit". Returns null when the mechanism carries
 * no comparable saving (cashback, free delivery) or when the source gave us
 * too little to compute one honestly — guessing would put wrong numbers in
 * published content.
 */
export function effectiveDiscountPercent(offer: Offer): number | null {
  const { mechanism, pricing } = offer;

  // These carry no per-unit saving at all, whatever the pricing says.
  if (mechanism.type === "cashback" || mechanism.type === "free_delivery") return null;

  /*
   * The adapters already normalise `savingsPercent` against the unit the offer
   * is *quoted* in. For "6 VOOR 29,94" the pricing block describes the whole
   * six-pack (2994 now, 3990 normally, 25% off) — so deriving a discount from
   * the mechanism on top of that multiplies the quantity in twice and reports
   * 87% for a 25% deal. Trust the normalised number whenever it exists.
   */
  if (pricing.savingsPercent !== null && pricing.savingsPercent > 0) {
    return pricing.savingsPercent;
  }

  // No normalised saving available — derive one only where it is unambiguous.
  switch (mechanism.type) {
    case "buy_x_get_y_free": {
      const total = mechanism.buyQuantity + mechanism.freeQuantity;
      if (total <= 0) return null;
      return Math.round((mechanism.freeQuantity / total) * 100);
    }

    case "nth_discounted": {
      // "2e halve prijs" discounts one item in every `nth`.
      if (mechanism.nth <= 0) return null;
      return Math.round(mechanism.percent / mechanism.nth);
    }

    case "percentage_off":
      return mechanism.percent;

    case "amount_off": {
      const { originalPriceCents } = pricing;
      if (originalPriceCents === null || originalPriceCents <= 0) return null;
      return Math.round((mechanism.amountCents / originalPriceCents) * 100);
    }

    // A multi-buy without a reference price cannot be converted to a
    // percentage without inventing the normal unit price.
    case "multi_buy":
    case "price_drop":
    case "unknown":
      return null;
  }
}

/** Whether the title looks like a real product rather than a section header. */
export function isPostableTitle(title: string): boolean {
  const trimmed = title.trim();
  if (trimmed.length < 3) return false;
  return !NON_PRODUCT_TITLES.some((pattern) => pattern.test(trimmed));
}

export interface WeeklyPick {
  offer: Offer;
  /** Comparable saving, always present on a pick. */
  discountPercent: number;
  daysLeft: number;
}

export interface WeeklyPicksOptions {
  /** Reference "now" — injected so output is deterministic and testable. */
  nowIso: string;
  limit?: number;
  maxPerStore?: number;
  minDaysLeft?: number;
}

/**
 * The week's picks: real products, still valid tomorrow, spread across chains,
 * sharpest discount first. Deterministic for a given offer set and `nowIso`.
 */
export function weeklyPicks(offers: Offer[], options: WeeklyPicksOptions): WeeklyPick[] {
  const {
    nowIso,
    limit = 10,
    // Scale the cap with the list: a fixed 2 per chain silently returns 20
    // results for a requested 200, which reads as missing data.
    maxPerStore = Math.max(MAX_PER_STORE, Math.ceil(limit / 5)),
    minDaysLeft = MIN_DAYS_LEFT,
  } = options;

  const candidates: WeeklyPick[] = [];

  for (const offer of offers) {
    if (!isActive(offer.validFrom, offer.validUntil, nowIso)) continue;
    if (!isPostableTitle(offer.title)) continue;

    const discountPercent = effectiveDiscountPercent(offer);
    if (discountPercent === null || discountPercent <= 0) continue;

    // An offer with no end date has no deadline to miss, so it always qualifies.
    const daysLeft = offer.validUntil ? daysUntilExpiry(offer.validUntil, nowIso) : Infinity;
    if (!Number.isNaN(daysLeft) && daysLeft < minDaysLeft) continue;

    candidates.push({ offer, discountPercent, daysLeft });
  }

  candidates.sort((a, b) => {
    if (b.discountPercent !== a.discountPercent) return b.discountPercent - a.discountPercent;
    // Stable tiebreak on id, so the same week always renders identically.
    return a.offer.id.localeCompare(b.offer.id);
  });

  const perStore = new Map<SupermarketSlug, number>();
  const picks: WeeklyPick[] = [];

  for (const candidate of candidates) {
    if (picks.length >= limit) break;
    const used = perStore.get(candidate.offer.source) ?? 0;
    if (used >= maxPerStore) continue;
    perStore.set(candidate.offer.source, used + 1);
    picks.push(candidate);
  }

  return picks;
}

/** ISO 8601 week number — the label every chain's promo cycle is quoted in. */
export function isoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
}
