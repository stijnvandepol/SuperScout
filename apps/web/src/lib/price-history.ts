import { readFileSync } from "node:fs";
import type { Offer, PriceInsight, PriceObservation } from "@superscout/core";
import { buildSeries, parseObservations, priceInsight, priceKey } from "@superscout/core";

/**
 * Read side of the price history the ingestion worker appends to.
 *
 * Server-only (node:fs), same as lib/offers.ts. The file grows by roughly one
 * line per product per day, so it is parsed once and cached rather than read
 * per offer page.
 */

const TTL_MS = 300_000;

let cache: { at: number; series: Map<string, PriceObservation[]> } | null = null;

function loadSeries(): Map<string, PriceObservation[]> {
  const path = process.env.PRICE_HISTORY_PATH;
  if (!path) return new Map();

  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.series;

  try {
    const series = buildSeries(parseObservations(readFileSync(path, "utf-8")));
    cache = { at: now, series };
    return series;
  } catch {
    // No history file yet is the normal state until the worker has run.
    return cache?.series ?? new Map();
  }
}

/**
 * What we can honestly say about this offer's price, or null when there is not
 * enough history to say anything. Callers render nothing on null — an empty
 * "price history" panel is worse than no panel.
 */
export function insightFor(offer: Offer): PriceInsight | null {
  const key = priceKey(offer);
  if (!key) return null;

  const observations = loadSeries().get(key);
  if (!observations) return null;

  return priceInsight(observations, offer.pricing.currentPriceCents);
}
