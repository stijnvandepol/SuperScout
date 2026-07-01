import type { SupermarketSlug } from "./supermarket";
import type { DiscountMechanism } from "./mechanism";

export interface OfferPricing {
  /** All in integer cents; null when the source did not provide it. */
  currentPriceCents: number | null;
  originalPriceCents: number | null;
  savingsAbsoluteCents: number | null;
  savingsPercent: number | null;
}

export interface OfferFlags {
  isOrganic?: boolean;
  isPrivateLabel?: boolean;
  /** NIX18 — alcohol/tobacco, restricted to 18+. */
  isAgeRestricted?: boolean;
}

/**
 * The normalized offer. Every SourceAdapter produces these, regardless of how
 * its upstream expresses things — nothing source-specific leaks past this shape.
 */
export interface Offer {
  /** Globally stable: `${source}:${sourceOfferId}`. */
  id: string;
  source: SupermarketSlug;
  sourceOfferId: string;

  title: string;
  description?: string;
  brand?: string;

  /** Our normalized category (mapping added later). */
  category?: string;
  /** The source's original category label, for mapping/debugging. */
  sourceCategoryRaw?: string;

  imageUrl?: string;

  pricing: OfferPricing;

  mechanism: DiscountMechanism;
  /** The source's original discount label, e.g. "1+1 GRATIS", "2 voor 3,99". */
  rawLabel?: string;

  /** ISO 8601. */
  validFrom: string;
  validUntil: string;
  isNextWeek?: boolean;

  flags: OfferFlags;

  url?: string;
  /** Product EANs, for cross-store price comparison later. */
  productEans?: string[];

  /** ISO 8601 timestamp of when this was ingested. */
  fetchedAt: string;
}
