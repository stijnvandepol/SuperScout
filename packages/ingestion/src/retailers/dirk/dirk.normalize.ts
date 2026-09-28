import { computeSavings, eurosToCents } from "@superscout/core";
import type { Offer } from "@superscout/core";
import type { DirkRawOffer } from "./dirk.raw";

/** Dirk serves offer images from this host, with the path percent-encoded. */
export const DIRK_IMAGE_BASE = "https://web-fileserver.dirk.nl/offers/";

/**
 * Map one raw Dirk offer to a normalized Offer.
 *
 * Dirk expresses every promotion as a plain price drop (offerPrice vs
 * normalPrice); it has no 1+1 / multi-buy labels, so `mechanism` is always
 * `price_drop`. When `normalPrice` is 0 the source gave no reference price, so
 * savings stay null rather than being invented.
 *
 * @param raw       the offer as Dirk's API returned it
 * @param fetchedAt ISO timestamp of ingestion
 */
export function normalizeDirkOffer(raw: DirkRawOffer, fetchedAt: string): Offer {
  const currentPriceCents = eurosToCents(raw.offerPrice);
  const originalPriceCents = raw.normalPrice > 0 ? eurosToCents(raw.normalPrice) : null;
  const savings = computeSavings(currentPriceCents, originalPriceCents);

  // An offer can wrap several products (all-null when Dirk only advertises the
  // umbrella deal). Use the first concrete product for brand/category hints.
  const firstProduct = raw.products.find((p) => p !== null) ?? null;
  const brand = firstProduct?.productInformation.brand.trim() || undefined;
  const sourceCategoryRaw = firstProduct?.productInformation.department || undefined;

  const offer: Offer = {
    id: `dirk:${raw.offerId}`,
    source: "dirk",
    sourceOfferId: String(raw.offerId),
    title: raw.headerText.trim(),
    pricing: {
      currentPriceCents,
      originalPriceCents,
      savingsAbsoluteCents: savings.absoluteCents,
      savingsPercent: savings.percent,
    },
    mechanism: { type: "price_drop" },
    rawLabel: raw.textPriceSign.trim(),
    validFrom: raw.startDate,
    validUntil: raw.endDate,
    flags: {},
    fetchedAt,
  };

  const description = raw.packaging.trim();
  if (description) offer.description = description;
  if (brand) offer.brand = brand;
  if (sourceCategoryRaw) offer.sourceCategoryRaw = sourceCategoryRaw;
  if (raw.image) offer.imageUrl = DIRK_IMAGE_BASE + encodeURIComponent(raw.image);
  // Dirk's API carries no per-offer web link; send shoppers to the offers page.
  offer.url = "https://www.dirk.nl/aanbiedingen";

  return offer;
}
