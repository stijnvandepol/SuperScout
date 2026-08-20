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

/**
 * The slice of an offer that a rendered card and the client-side filters read.
 *
 * `OfferExplorer` is a client component, so every field of every offer it
 * receives is serialised into the RSC flight payload — shipped in the HTML,
 * parsed on the main thread. The homepage hands it the whole live set so search
 * and filtering stay instant, which is the right call; it just should not pay
 * for fields nobody reads. Measured on production, `fetchedAt`, `validFrom`,
 * `url`, `flags` and `description` were a quarter of that payload and were
 * touched by exactly zero components.
 *
 * Server-rendered listings (store, category, deal type) do not cross a
 * serialisation boundary and can keep passing full offers — a full `Offer`
 * satisfies this type.
 */
export type CardOffer = Pick<
  Offer,
  | "id"
  | "source"
  | "sourceOfferId"
  | "title"
  | "brand"
  | "imageUrl"
  | "pricing"
  | "mechanism"
  | "rawLabel"
  | "validUntil"
  | "sourceCategoryRaw"
>;

/** Project an offer down to what a card needs, dropping the rest. */
export function toCardOffer(offer: Offer): CardOffer {
  return {
    id: offer.id,
    source: offer.source,
    sourceOfferId: offer.sourceOfferId,
    title: offer.title,
    ...(offer.brand !== undefined ? { brand: offer.brand } : {}),
    ...(offer.imageUrl !== undefined ? { imageUrl: offer.imageUrl } : {}),
    pricing: offer.pricing,
    mechanism: offer.mechanism,
    ...(offer.rawLabel !== undefined ? { rawLabel: offer.rawLabel } : {}),
    validUntil: offer.validUntil,
    ...(offer.sourceCategoryRaw !== undefined
      ? { sourceCategoryRaw: offer.sourceCategoryRaw }
      : {}),
  };
}
