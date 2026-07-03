import { computeSavings, type DiscountMechanism, type Offer } from "@superscout/core";
import type { DekamarktRawOffer } from "./dekamarkt.raw";

function priceStrToCents(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/** Map one scraped DekaMarkt offer to a normalized Offer. */
export function normalizeDekamarktOffer(raw: DekamarktRawOffer, fetchedAt: string): Offer {
  const currentPriceCents = priceStrToCents(raw.currentPrice);
  const originalPriceCents = priceStrToCents(raw.oldPrice);
  const savings = computeSavings(currentPriceCents, originalPriceCents);
  const label = raw.label?.trim() ?? "";

  const freebie = label.match(/(\d+)\s*\+\s*(\d+)\s*gratis/i);
  const percent = label.match(/(\d+)\s*%\s*korting/i);
  const hasPriceDrop =
    currentPriceCents !== null && originalPriceCents !== null && currentPriceCents < originalPriceCents;

  let mechanism: DiscountMechanism = { type: "unknown" };
  if (freebie) {
    mechanism = { type: "buy_x_get_y_free", buyQuantity: Number(freebie[1]), freeQuantity: Number(freebie[2]) };
  } else if (percent) {
    mechanism = { type: "percentage_off", percent: Number(percent[1]) };
  } else if (hasPriceDrop) {
    mechanism = { type: "price_drop" };
  }

  const offer: Offer = {
    id: `dekamarkt:${raw.id}`,
    source: "dekamarkt",
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

  if (raw.addition?.trim()) offer.description = raw.addition.trim();
  // Keep a promo-ish label (skip pure unit labels like "PER KILO 0,99").
  if (label && !/^\s*(per\b|\d+\s*(gram|kilo|stuk|ml|liter))/i.test(label)) offer.rawLabel = label;
  if (raw.image) offer.imageUrl = raw.image;
  offer.url = "https://www.dekamarkt.nl/aanbiedingen";

  return offer;
}
