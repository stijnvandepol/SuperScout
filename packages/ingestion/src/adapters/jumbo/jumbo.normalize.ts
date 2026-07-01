import type { DiscountMechanism, Offer } from "@superscout/core";
import type { JumboRawPromotion } from "./jumbo.raw";
import { parseJumboMechanism } from "./jumbo.mechanism";

const JUMBO_BASE = "https://www.jumbo.com";

/**
 * Map one raw Jumbo promotion to a normalized Offer. Pricing is left null:
 * nuTab gives no old/new price, only the promotion tag, so the deal lives in
 * `mechanism` + `rawLabel`. The mechanism is delegated to parseJumboMechanism.
 */
export function normalizeJumboPromotion(
  raw: JumboRawPromotion,
  fetchedAt: string,
  categoryLabel?: string,
): Offer {
  const rawLabel = raw.tags[0]?.text.trim() || undefined;
  const mechanism: DiscountMechanism = rawLabel
    ? parseJumboMechanism(rawLabel)
    : { type: "unknown" };

  const offer: Offer = {
    id: `jumbo:${raw.id}`,
    source: "jumbo",
    sourceOfferId: raw.id,
    title: raw.title.trim(),
    pricing: {
      currentPriceCents: null,
      originalPriceCents: null,
      savingsAbsoluteCents: null,
      savingsPercent: null,
    },
    mechanism,
    validFrom: raw.start.iso,
    validUntil: raw.end.iso,
    flags: {},
    fetchedAt,
  };

  const description = raw.subtitle?.replace(/<br\s*\/?>/gi, " ").trim();
  if (description) offer.description = description;
  if (rawLabel) offer.rawLabel = rawLabel;
  if (categoryLabel) offer.sourceCategoryRaw = categoryLabel;
  if (raw.image) offer.imageUrl = raw.image;
  if (raw.url) offer.url = raw.url.startsWith("http") ? raw.url : `${JUMBO_BASE}${raw.url}`;

  return offer;
}
