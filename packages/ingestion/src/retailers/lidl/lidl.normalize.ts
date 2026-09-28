import { computeSavings, type DiscountMechanism, type Offer } from "@superscout/core";
import type { LidlRawOffer } from "./lidl.raw";

/** Parse a Lidl price string ("6.49" or "1,49") to integer cents; else null. */
function priceStrToCents(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Parse a "DD/MM - DD/MM" validity range out of a badge. The year comes from
 * the fetch date; if the end month/day falls before the start, it rolled into
 * the next year. Returns empty strings when no range is present.
 */
function parseValidity(badge: string | undefined, fetchedAt: string): { from: string; until: string } {
  const m = badge?.match(/(\d{1,2})\/(\d{1,2})\s*[-–—]\s*(\d{1,2})\/(\d{1,2})/);
  if (!m) return { from: "", until: "" };
  const d1 = Number(m[1]);
  const mo1 = Number(m[2]);
  const d2 = Number(m[3]);
  const mo2 = Number(m[4]);
  const year = new Date(fetchedAt).getUTCFullYear();
  const startKey = mo1 * 100 + d1;
  const endKey = mo2 * 100 + d2;
  const endYear = endKey < startKey ? year + 1 : year;
  return { from: `${year}-${pad(mo1)}-${pad(d1)}`, until: `${endYear}-${pad(mo2)}-${pad(d2)}` };
}

/** Map one scraped Lidl offer to a normalized Offer. */
export function normalizeLidlOffer(raw: LidlRawOffer, fetchedAt: string): Offer {
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

  const { from, until } = parseValidity(raw.badge, fetchedAt);

  const offer: Offer = {
    id: `lidl:${raw.id}`,
    source: "lidl",
    sourceOfferId: raw.id,
    title: raw.title.trim(),
    pricing: {
      currentPriceCents,
      originalPriceCents,
      savingsAbsoluteCents: savings.absoluteCents,
      savingsPercent: savings.percent,
    },
    mechanism,
    validFrom: from,
    validUntil: until,
    flags: {},
    fetchedAt,
  };

  if (raw.description?.trim()) offer.description = raw.description.trim();
  if (raw.pack?.trim()) offer.rawLabel = raw.pack.trim();
  if (raw.image) offer.imageUrl = raw.image;
  offer.url = raw.url ? `https://www.lidl.nl${raw.url}` : "https://www.lidl.nl/c/aanbiedingen/a10008785";

  return offer;
}
