import type { Offer } from "@superscout/core";
import data from "@/data/offers.json";

/** Seeded from the ingestion pipeline over real captured fixtures. */
export const OFFERS = data as unknown as Offer[];

export function stats(offers: Offer[]): { total: number; stores: number } {
  return { total: offers.length, stores: new Set(offers.map((o) => o.source)).size };
}

export function byBiggestDiscount(offers: Offer[]): Offer[] {
  return [...offers].sort(
    (a, b) => (b.pricing.savingsPercent ?? 0) - (a.pricing.savingsPercent ?? 0),
  );
}
