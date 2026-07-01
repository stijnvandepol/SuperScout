import { computeSavings, eurosToCents, type DiscountMechanism, type Offer } from "@superscout/core";
import type { PlusRawOffer } from "./plus.raw";
import { parsePlusMechanism } from "./plus.mechanism";

/** Parse a Plus dot-decimal price string; "0.0"/empty/invalid -> null. */
function priceStrToCents(value: string | undefined): number | null {
  const n = Number.parseFloat(value ?? "");
  return Number.isFinite(n) && n > 0 ? eurosToCents(n) : null;
}

/** Contentful image urls are sometimes protocol-relative ("//images..."). */
function absoluteImageUrl(url: string): string | undefined {
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("http")) return url;
  return undefined;
}

/**
 * Map one raw Plus offer (with its category label) to a normalized Offer.
 * Mechanism comes from the label; unrecognised labels fall back to price_drop
 * when there is a genuine price reduction, else unknown.
 */
export function normalizePlusOffer(
  raw: PlusRawOffer,
  categoryLabel: string,
  fetchedAt: string,
): Offer {
  const currentPriceCents = priceStrToCents(raw.NewPrice);
  const originalPriceCents =
    priceStrToCents(raw.PriceOriginal_Product) ??
    priceStrToCents(raw.PriceOriginal_Lowest) ??
    priceStrToCents(raw.PriceOriginal_Highest);
  const savings = computeSavings(currentPriceCents, originalPriceCents);

  const parsed = parsePlusMechanism(raw.DisplayInfo_Label ?? "");
  const hasPriceDrop =
    currentPriceCents !== null && originalPriceCents !== null && currentPriceCents < originalPriceCents;
  const mechanism: DiscountMechanism =
    parsed.type !== "unknown" ? parsed : hasPriceDrop ? { type: "price_drop" } : { type: "unknown" };

  const offer: Offer = {
    id: `plus:${raw.PromotionID}-${raw.Offer_Id}`,
    source: "plus",
    sourceOfferId: `${raw.PromotionID}-${raw.Offer_Id}`,
    title: raw.Name.trim() || raw.Brand.trim(),
    pricing: {
      currentPriceCents,
      originalPriceCents,
      savingsAbsoluteCents: savings.absoluteCents,
      savingsPercent: savings.percent,
    },
    mechanism,
    validFrom: raw.StartDate,
    validUntil: raw.EndDate,
    flags: {},
    fetchedAt,
  };

  const rawLabel = raw.DisplayInfo_Label?.trim();
  if (rawLabel) offer.rawLabel = rawLabel;
  const description = raw.Example.trim() || raw.Variant.trim();
  if (description) offer.description = description;
  const brand = raw.Brand.trim();
  if (brand) offer.brand = brand;
  if (categoryLabel) offer.sourceCategoryRaw = categoryLabel;
  const imageUrl = absoluteImageUrl(raw.ImageURL ?? "");
  if (imageUrl) offer.imageUrl = imageUrl;
  if (raw.IsProductOverMajorityAge || raw.Product_IsNIX18) offer.flags.isAgeRestricted = true;

  return offer;
}
