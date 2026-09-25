import { RETAILERS, RETAILER_SLUGS, type RetailerSlug } from "./retailer";

/**
 * The retailers SuperScout can carry offers for.
 *
 * Historical name: this started as a supermarket list, and `SupermarketSlug`
 * is threaded through every adapter, page and test. The registry itself now
 * lives in `retailer.ts` and covers drugstores, department stores and DIY
 * chains too; these names stay as aliases so that widening the scope did not
 * turn into a rename across fifty files.
 */
export const SUPERMARKETS = RETAILERS;

export type SupermarketSlug = RetailerSlug;

export function supermarketName(slug: SupermarketSlug): string {
  return RETAILERS[slug].name;
}

/**
 * Chains an adapter actually fetches, as opposed to slugs the type system
 * merely permits.
 *
 * The distinction is not cosmetic. "Which chains do we cover" was implicit in
 * `sources.ts` and `browser-sources.ts`, so anything reasoning about coverage
 * had to fall back to the full slug list — and a page trying to explain why a
 * chain was missing ended up announcing that Coop, Ekoplaza, Spar and Vomar
 * were "temporarily unavailable" when no adapter for them was ever written.
 *
 * A chain in this list with no offers today is a broken adapter. A chain
 * outside it is simply not built yet. Only the first is worth apologising for.
 */
export const INGESTED_SUPERMARKETS = RETAILER_SLUGS.filter((slug) => RETAILERS[slug].ingested);
