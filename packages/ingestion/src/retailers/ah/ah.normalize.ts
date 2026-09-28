import { computeSavings, eurosToCents, type Offer } from "@superscout/core";
import type { AhPromotionImage, AhRawPromotion } from "./ah.raw";
import { parseAhMechanism } from "./ah.mechanism";

const AH_BASE = "https://www.ah.nl";

/** Pick the highest-resolution image rendition available. */
function largestImageUrl(images: AhPromotionImage[] | null): string | undefined {
  if (!images || images.length === 0) return undefined;
  return images.reduce((best, img) => ((img.width ?? 0) > (best.width ?? 0) ? img : best)).url;
}

function centsOrNull(money: { amount: number } | null | undefined): number | null {
  return money?.amount != null ? eurosToCents(money.amount) : null;
}

/**
 * Map one raw AH bonus promotion to a normalized Offer. Mechanism comes from
 * the structured label (parseAhMechanism); pricing from the optional
 * PromotionPrice (now/was), which is only present for single-price promos.
 */
export function normalizeAhPromotion(raw: AhRawPromotion, fetchedAt: string): Offer {
  const label = raw.rawPromotionLabels?.[0];
  const currentPriceCents = centsOrNull(raw.price?.now);
  const originalPriceCents = centsOrNull(raw.price?.was);
  const savings = computeSavings(currentPriceCents, originalPriceCents);

  const offer: Offer = {
    id: `ah:${raw.id}`,
    source: "ah",
    sourceOfferId: raw.id,
    title: raw.title.trim(),
    pricing: {
      currentPriceCents,
      originalPriceCents,
      savingsAbsoluteCents: savings.absoluteCents,
      savingsPercent: savings.percent,
    },
    mechanism: parseAhMechanism(label),
    validFrom: raw.periodStart,
    validUntil: raw.periodEnd,
    flags: {},
    fetchedAt,
  };

  const rawLabel = label?.defaultDescription?.trim();
  if (rawLabel) offer.rawLabel = rawLabel;
  if (raw.subtitle?.trim()) offer.description = raw.subtitle.trim();
  if (raw.category) offer.sourceCategoryRaw = raw.category;
  const imageUrl = largestImageUrl(raw.images);
  if (imageUrl) offer.imageUrl = imageUrl;
  if (raw.webPath) offer.url = `${AH_BASE}${raw.webPath}`;

  return offer;
}
