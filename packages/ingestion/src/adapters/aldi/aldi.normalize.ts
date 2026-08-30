import { computeSavings, type DiscountMechanism, type Offer } from "@superscout/core";
import type { AldiRawOffer } from "./aldi.raw";

/** Parse an Aldi price string ("0.49" or "1,49") to integer cents; else null. */
function priceStrToCents(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/**
 * Map one scraped Aldi offer to a normalized Offer.
 *
 * The tiles carry a discount percentage but usually no strikethrough price. The
 * dates are not in the tile either — they are joined in by the adapter from the
 * page's own JSON blob (see aldi.validity.ts). They stay optional here: if that
 * blob ever moves, offers still flow, just without a period.
 */
export function normalizeAldiOffer(raw: AldiRawOffer, fetchedAt: string): Offer {
  const currentPriceCents = priceStrToCents(raw.currentPrice);
  const originalPriceCents = priceStrToCents(raw.oldPrice);
  const savings = computeSavings(currentPriceCents, originalPriceCents);
  const percent = raw.discount ? Number.parseInt(raw.discount.replace(/[^\d]/g, ""), 10) : NaN;

  const hasPriceDrop =
    currentPriceCents !== null && originalPriceCents !== null && currentPriceCents < originalPriceCents;
  const mechanism: DiscountMechanism = hasPriceDrop
    ? { type: "price_drop" }
    : Number.isFinite(percent) && percent > 0
      ? { type: "percentage_off", percent }
      : { type: "unknown" };

  const offer: Offer = {
    id: `aldi:${raw.id}`,
    source: "aldi",
    sourceOfferId: raw.id,
    title: raw.title.trim(),
    pricing: {
      currentPriceCents,
      originalPriceCents,
      savingsAbsoluteCents: savings.absoluteCents,
      savingsPercent: savings.percent,
    },
    mechanism,
    validFrom: raw.validFrom ?? "",
    validUntil: raw.validUntil ?? "",
    flags: {},
    fetchedAt,
  };

  if (raw.brand?.trim()) offer.brand = raw.brand.trim();
  if (raw.unit?.trim()) offer.rawLabel = raw.unit.trim();
  if (raw.image) offer.imageUrl = raw.image;
  offer.url = raw.url ? `https://www.aldi.nl${raw.url}` : "https://www.aldi.nl/aanbiedingen.html";

  return offer;
}
