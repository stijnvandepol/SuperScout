import { type DiscountMechanism, type Offer } from "@superscout/core";
import type { PoieszRawOffer } from "./poiesz.raw";

function priceStrToCents(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

/** Interpret a Poiesz promo label into a mechanism. */
function parsePromo(label: string): DiscountMechanism {
  const freebie = label.match(/(\d+)\s*\+\s*(\d+)\s*gratis/i);
  if (freebie) {
    return { type: "buy_x_get_y_free", buyQuantity: Number(freebie[1]), freeQuantity: Number(freebie[2]) };
  }
  const percent = label.match(/(\d+)\s*%\s*korting/i);
  if (percent) return { type: "percentage_off", percent: Number(percent[1]) };
  const multi = label.match(/(\d+)\s*voor\s*€?\s*(\d+[.,]\d{2})/i);
  if (multi) return { type: "multi_buy", buyQuantity: Number(multi[1]), totalPriceCents: priceStrToCents(multi[2]) ?? 0 };
  return { type: "unknown" };
}

/** Map one scraped Poiesz offer to a normalized Offer. */
export function normalizePoieszOffer(raw: PoieszRawOffer, fetchedAt: string): Offer {
  const currentPriceCents = priceStrToCents(raw.currentPrice);
  const label = raw.promo?.trim() ?? "";

  const offer: Offer = {
    id: `poiesz:${raw.id}`,
    source: "poiesz",
    sourceOfferId: raw.id,
    title: raw.title.trim(),
    pricing: {
      currentPriceCents,
      originalPriceCents: null,
      savingsAbsoluteCents: null,
      savingsPercent: null,
    },
    mechanism: label ? parsePromo(label) : { type: "unknown" },
    validFrom: "",
    validUntil: "",
    flags: {},
    fetchedAt,
  };

  if (label) offer.rawLabel = label;
  if (raw.image) offer.imageUrl = raw.image.replace(/\\/g, "/");
  offer.url = raw.url
    ? `https://webwinkel.poiesz-supermarkten.nl${raw.url}`
    : "https://webwinkel.poiesz-supermarkten.nl/aanbiedingen";

  return offer;
}
