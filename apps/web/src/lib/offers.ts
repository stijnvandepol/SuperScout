import { readFileSync } from "node:fs";
import type { Offer } from "@superscout/core";
import { CATEGORIES, categorizeOffer, type CategorySlug } from "@superscout/core";
import { offerSlug } from "@/lib/format";
import seed from "@/data/offers.json";

// Bundled snapshot — the fallback when no live data file is mounted.
const SEED = seed as unknown as Offer[];

// Importing node:fs makes this module server-only: a client component that
// imports it fails the build loudly, which is the guard we want.
const TTL_MS = 60_000;
let cache: { at: number; offers: Offer[] } | null = null;

/**
 * All current offers. Reads the live file at OFFERS_PATH (written by the
 * ingestion worker) when set, else the bundled seed. Cached briefly so ISR
 * re-reads stay cheap.
 */
export function getOffers(): Offer[] {
  const path = process.env.OFFERS_PATH;
  if (!path) return SEED;

  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.offers;
  try {
    const offers = JSON.parse(readFileSync(path, "utf-8")) as Offer[];
    cache = { at: now, offers };
    return offers;
  } catch {
    return cache?.offers ?? SEED;
  }
}

export function getBySlug(slug: string): Offer | undefined {
  return getOffers().find((o) => offerSlug(o) === slug);
}

export function offersInCategory(slug: string): Offer[] {
  return getOffers().filter((o) => categorizeOffer(o) === slug);
}

export function stats(offers: Offer[]): { total: number; stores: number } {
  return { total: offers.length, stores: new Set(offers.map((o) => o.source)).size };
}

export function byBiggestDiscount(offers: Offer[]): Offer[] {
  return [...offers].sort(
    (a, b) => (b.pricing.savingsPercent ?? 0) - (a.pricing.savingsPercent ?? 0),
  );
}

export interface CategorySummary {
  slug: CategorySlug;
  label: string;
  count: number;
}

/** Categories that actually have offers, in taxonomy order, with counts. */
export function categoriesPresent(): CategorySummary[] {
  const counts = new Map<CategorySlug, number>();
  for (const offer of getOffers()) {
    const slug = categorizeOffer(offer);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return CATEGORIES.filter((c) => counts.has(c.slug)).map((c) => ({
    slug: c.slug,
    label: c.label,
    count: counts.get(c.slug) ?? 0,
  }));
}
