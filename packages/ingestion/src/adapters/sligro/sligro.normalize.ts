import { computeSavings, type DiscountMechanism, type Offer } from "@superscout/core";
import type { SligroRawOffer } from "./sligro.raw";

function priceStrToCents(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/** Map one scraped Sligro offer to a normalized Offer (prices are ex-VAT). */
export function normalizeSligroOffer(raw: SligroRawOffer, fetchedAt: string): Offer {
  const currentPriceCents = priceStrToCents(raw.currentPrice);
  const originalPriceCents = priceStrToCents(raw.oldPrice);
  const savings = computeSavings(currentPriceCents, originalPriceCents);
  const hasPriceDrop =
    currentPriceCents !== null && originalPriceCents !== null && currentPriceCents < originalPriceCents;
  const mechanism: DiscountMechanism = hasPriceDrop ? { type: "price_drop" } : { type: "unknown" };

  const offer: Offer = {
    id: `sligro:${raw.id}`,
    source: "sligro",
    sourceOfferId: raw.id,
    title: raw.title.trim(),
    pricing: {
      currentPriceCents,
      originalPriceCents,
      savingsAbsoluteCents: savings.absoluteCents,
      savingsPercent: savings.percent,
    },
    mechanism,
    validFrom: "",
    validUntil: "",
    flags: {},
    fetchedAt,
  };

  if (raw.unit?.trim()) offer.rawLabel = raw.unit.trim();
  // Sligro's grid serves a 100x100 "small" thumbnail (blurry when enlarged);
  // the "medium" rendition is 319x319 and sharp.
  if (raw.image) offer.imageUrl = raw.image.replace(/\/small\.(png|jpe?g|webp)(\?|$)/i, "/medium.$1$2");
  offer.url = raw.url ? `https://www.sligro.nl${raw.url}` : "https://www.sligro.nl/aanbiedingen.html";

  return offer;
}
