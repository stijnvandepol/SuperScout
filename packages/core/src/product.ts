import type { SupermarketSlug } from "./supermarket";

/**
 * A catalogue item, as opposed to a promotion.
 *
 * An `Offer` describes something being discounted this week: it has a validity
 * period, a mechanism and a saving, and it stops existing when the promotion
 * ends. A `Product` is what the chain sells, full stop — it has a shelf price
 * and it is there next week too.
 *
 * That difference is the whole point. Offer URLs could never accumulate ranking
 * because they died on a weekly cycle; a product URL is permanent, so every
 * week it is on offer adds to the same page instead of starting a new one. It
 * also opens a query class the promotion feed cannot reach at all — "wat kost
 * X bij Y" — which is where the search volume actually is.
 *
 * Deliberately no cross-chain identity. No Dutch chain publishes EANs: the
 * promotion feeds carry none, and AH's own catalogue has no `gtin`, `ean` or
 * `sku` either — only an internal id. Matching a product across chains is
 * therefore a fuzzy-matching problem, not a lookup, and it is kept out of this
 * type rather than faked with a field that would imply otherwise.
 */
export interface Product {
  /** Globally stable: `${source}:${sourceProductId}`. */
  id: string;
  source: SupermarketSlug;
  /** The chain's own product id — stable across weeks, unlike an offer id. */
  sourceProductId: string;

  title: string;
  brand?: string;
  /** How the price is quoted, e.g. "2 stuks", "650 g". */
  salesUnitSize?: string;

  /** Shelf price in integer cents; null when the chain did not publish one. */
  priceCents: number | null;
  /**
   * Price before the current promotion, when the chain distinguishes them.
   *
   * Present only while something is discounted, so it is a promotion signal
   * rather than a price history — the real history lives in price-history.ts.
   */
  priceBeforeBonusCents?: number | null;
  /** Comparable unit price, e.g. cents per kilo, when published. */
  unitPriceCents?: number | null;
  /** What that unit price is per, e.g. "kg", "l". */
  unitPriceLabel?: string;

  imageUrl?: string;
  /** The chain's own category path, e.g. "Ontbijtgranen, beleg/Pindakaas". */
  categoryPath?: string;
  /** Leaf taxonomy id at the chain, for re-crawling a single aisle. */
  taxonomyId?: number;

  url?: string;

  /** ISO 8601 timestamp of when this was ingested. */
  fetchedAt: string;
}
