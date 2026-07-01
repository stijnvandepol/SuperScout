import type { Offer } from "./offer";
import type { SupermarketSlug } from "./supermarket";

/**
 * The one interface every data source implements — a direct chain API (Dirk,
 * Jumbo, AH, Plus) or, later, a folder-aggregator covering the long tail.
 * Consumers depend only on this: fetch raw upstream data, return normalized Offers.
 */
export interface SourceAdapter {
  readonly source: SupermarketSlug;
  fetchOffers(): Promise<Offer[]>;
}
