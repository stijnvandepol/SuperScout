import { type DiscountMechanism, type Offer } from "@superscout/core";
import type { HoogvlietRawOffer } from "./hoogvliet.raw";

function toCents(value: string): number | null {
  const n = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/**
 * Interpret a Hoogvliet promo label into a mechanism and (where the label is a
 * plain price) a current price. Recognised: "X+Y gratis", "X voor <prijs>",
 * "X% korting". Anything else with a bare price is an unknown-mechanism offer
 * priced at that amount; labels with no price stay unknown/priceless.
 */
export function normalizeHoogvlietOffer(raw: HoogvlietRawOffer, fetchedAt: string): Offer {
  const label = raw.promoLabel.trim();
  let mechanism: DiscountMechanism = { type: "unknown" };
  let currentPriceCents: number | null = null;

  const freebie = label.match(/(\d+)\s*\+\s*(\d+)\s*gratis/i);
  const multi = label.match(/(\d+)\s*(?:voor|halen betaal)\s*€?\s*(\d+[.,]\d{2})/i);
  const percent = label.match(/(\d+)\s*%\s*korting/i);

  if (freebie) {
    mechanism = { type: "buy_x_get_y_free", buyQuantity: Number(freebie[1]), freeQuantity: Number(freebie[2]) };
  } else if (multi) {
    mechanism = { type: "multi_buy", buyQuantity: Number(multi[1]), totalPriceCents: toCents(multi[2]!) ?? 0 };
  } else if (percent) {
    mechanism = { type: "percentage_off", percent: Number(percent[1]) };
  } else {
    const price = label.match(/(\d+[.,]\d{2})/);
    if (price) currentPriceCents = toCents(price[1]!);
  }

  const offer: Offer = {
    id: `hoogvliet:${raw.id}`,
    source: "hoogvliet",
    sourceOfferId: raw.id,
    title: raw.title.trim(),
    pricing: {
      currentPriceCents,
      originalPriceCents: null,
      savingsAbsoluteCents: null,
      savingsPercent: null,
    },
    mechanism,
    validFrom: "",
    validUntil: "",
    flags: {},
    fetchedAt,
  };

  if (label) offer.rawLabel = label;
  if (raw.description?.trim()) offer.description = raw.description.trim();
  if (raw.image) {
    offer.imageUrl = raw.image.startsWith("http") ? raw.image : `https://www.hoogvliet.com${raw.image}`;
  }
  offer.url = `https://www.hoogvliet.com/aanbiedingen/${raw.id}`;

  return offer;
}
