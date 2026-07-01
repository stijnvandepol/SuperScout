import type { Offer } from "@superscout/core";
import { CATEGORIES, categorizeOffer, type CategorySlug } from "@superscout/core";
import { offerSlug } from "@/lib/format";
import data from "@/data/offers.json";

/** Seeded from the ingestion pipeline over real captured fixtures. */
export const OFFERS = data as unknown as Offer[];

export function getBySlug(slug: string): Offer | undefined {
  return OFFERS.find((o) => offerSlug(o) === slug);
}

export function offersInCategory(slug: string): Offer[] {
  return OFFERS.filter((o) => categorizeOffer(o) === slug);
}

export interface CategorySummary {
  slug: CategorySlug;
  label: string;
  count: number;
}

/** Categories that actually have offers, in taxonomy order, with counts. */
export function categoriesPresent(): CategorySummary[] {
  const counts = new Map<CategorySlug, number>();
  for (const offer of OFFERS) {
    const slug = categorizeOffer(offer);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return CATEGORIES.filter((c) => counts.has(c.slug)).map((c) => ({
    slug: c.slug,
    label: c.label,
    count: counts.get(c.slug) ?? 0,
  }));
}

export function stats(offers: Offer[]): { total: number; stores: number } {
  return { total: offers.length, stores: new Set(offers.map((o) => o.source)).size };
}

export function byBiggestDiscount(offers: Offer[]): Offer[] {
  return [...offers].sort(
    (a, b) => (b.pricing.savingsPercent ?? 0) - (a.pricing.savingsPercent ?? 0),
  );
}
