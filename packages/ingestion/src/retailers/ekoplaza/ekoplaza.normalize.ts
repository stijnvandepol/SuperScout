import { computeSavings, eurosToCents, parsePromoLabel } from "@superscout/core";
import type { Offer } from "@superscout/core";
import type { EkoplazaProduct } from "./ekoplaza.raw";

/**
 * Whether a product in the offers listing actually carries a promotion.
 *
 * The `acties=true` facet also returns products whose promotion has lapsed:
 * no active discount, an empty label, equal prices. Those are regular prices
 * and do not belong on an offers site.
 */
export function isEkoplazaPromotion(p: EkoplazaProduct): boolean {
  const active = (p.discounts ?? []).some((d) => d.isActive);
  const label = cleanLabel(p.label?.name);
  return active || label.length > 0;
}

/** "15% korting|" -> "15% korting". The pipe separates label parts. */
function cleanLabel(label: string | undefined): string {
  return (label ?? "").split("|").map((s) => s.trim()).filter(Boolean).join(" ");
}

/** "2026-09-29 23:59:00" -> "2026-09-29T23:59:00.000Z", like the other chains' wall-clock dates. */
function isoDate(local: string | undefined): string {
  if (!local) return "";
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(local);
  return m ? `${m[1]}T${m[2]}.000Z` : "";
}

function field(p: EkoplazaProduct, code: string): string | undefined {
  return p.fields?.find((f) => f.code === code)?.value?.trim() || undefined;
}

/**
 * Map one Ekoplaza product to an Offer.
 *
 * The label says what the deal is ("15% korting", "€ 1 korting", "2 voor
 * 6,00"); the prices say what it costs. When the label is not one we can
 * structure but the price did drop, it is a plain price drop.
 */
export function normalizeEkoplazaProduct(p: EkoplazaProduct, fetchedAt: string): Offer {
  const current = p.price?.inclTax;
  const original = p.originalPrice?.inclTax;
  const currentPriceCents = typeof current === "number" ? eurosToCents(current) : null;
  const originalPriceCents =
    typeof original === "number" && typeof current === "number" && original > current ? eurosToCents(original) : null;
  const savings = computeSavings(currentPriceCents, originalPriceCents);

  const label = cleanLabel(p.label?.name);
  let mechanism = label ? parsePromoLabel(label) : ({ type: "unknown" } as const);
  if (mechanism.type === "unknown" && originalPriceCents !== null) mechanism = { type: "price_drop" };

  const discount = (p.discounts ?? []).find((d) => d.isActive);
  const content = field(p, "INHOUD");
  const unit = field(p, "EENHEID");

  const offer: Offer = {
    id: `ekoplaza:${p.id}`,
    source: "ekoplaza",
    sourceOfferId: p.id,
    title: p.name.trim(),
    pricing: {
      currentPriceCents,
      originalPriceCents,
      savingsAbsoluteCents: savings.absoluteCents,
      savingsPercent: savings.percent,
    },
    mechanism,
    validFrom: isoDate(discount?.startDate),
    validUntil: isoDate(discount?.endDate),
    flags: /biologisch/i.test(field(p, "PFC_CertificationsLabel") ?? "") ? { isOrganic: true } : {},
    fetchedAt,
  };

  if (label) offer.rawLabel = label;
  const brand = p.brand?.name?.trim();
  if (brand) offer.brand = brand;
  if (p.group?.Description) offer.sourceCategoryRaw = p.group.Description;
  if (p.image) offer.imageUrl = p.image;
  if (p.url) offer.url = p.url;
  if (content && unit) offer.unit = `${content} ${unit.toLowerCase()}`;
  return offer;
}
