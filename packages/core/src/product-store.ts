import type { Product } from "./product";
import type { SupermarketSlug } from "./supermarket";

/**
 * Where catalogue products land.
 *
 * Async, and an interface rather than a concrete class, for the same reason
 * `OfferStore` is: the offers set is ~1.000 records and lives happily in a JSON
 * file, but a catalogue is 42.000 for Albert Heijn alone. Reading and parsing
 * that on every request is not an option, so this is backed by SQLite — and
 * keeping the seam means tests can run against an in-memory implementation
 * without a database.
 */
export interface ProductQuery {
  source?: SupermarketSlug;
  /** Case-insensitive substring over title and brand. */
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ProductStore {
  /** Insert or replace. Implementations must make this atomic per batch. */
  upsertMany(products: Product[]): Promise<void>;
  get(id: string): Promise<Product | undefined>;
  /** By chain plus the chain's own product id — how an adapter re-finds one. */
  bySourceId(source: SupermarketSlug, sourceProductId: string): Promise<Product | undefined>;
  query(q: ProductQuery): Promise<Product[]>;
  count(source?: SupermarketSlug): Promise<number>;
  /**
   * Drop products from a chain that were not seen in the latest pass.
   *
   * A catalogue shrinks as well as grows, and a delisted product that lingers
   * is a page promising a price the shop no longer offers. Scoped per chain so
   * one adapter failing never empties another's aisle.
   */
  pruneStale(source: SupermarketSlug, seenBefore: string): Promise<number>;
  close(): Promise<void>;
}
