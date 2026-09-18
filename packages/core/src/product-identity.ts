import type { Product } from "./product";
import type { SupermarketSlug } from "./supermarket";

/**
 * How a product page is addressed.
 *
 *   /product/ah/618268/ah-smeuige-pindakaas-2-pack
 *            ^chain ^id  ^slug
 *
 * The id resolves the page; the slug is decorative. That ordering is the whole
 * point of this project. An offer URL keyed on a promotion id died every week,
 * so no page ever accumulated ranking — and a URL keyed on the *title* would
 * repeat the mistake more slowly, because chains reword their products
 * ("AH Smeuige pindakaas" becoming "AH Pindakaas smeuig" breaks the link and
 * strands whatever the old URL had earned).
 *
 * Keying on the chain's own product id means a rewording changes the readable
 * tail and nothing else: the page keeps its address, its history and its
 * ranking. A request carrying a stale slug still resolves, and the page
 * canonicalises to the current spelling.
 */

/** Strip a title down to a URL-safe, readable tail. */
export function titleSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      // Drop diacritics so "Calvé" and "Calve" produce the same tail.
      .replace(/[̀-ͯ]/g, "")
      .replace(/&/g, " en ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      // Long enough to stay readable, short enough to stay a URL.
      .slice(0, 80)
      .replace(/-+$/g, "")
  );
}

export interface ProductRef {
  chain: SupermarketSlug;
  id: string;
  slug: string;
}

/** The canonical path for a product. */
export function productPath(product: Product): string {
  return `/product/${product.source}/${product.sourceProductId}/${titleSlug(product.title)}`;
}

/**
 * Whether a requested path already points at the canonical spelling.
 *
 * A mismatch is not an error — the id resolved, so the visitor gets their page
 * — but it earns a redirect so search engines settle on one address per
 * product rather than indexing every historical wording.
 */
export function isCanonicalSlug(product: Product, requestedSlug: string): boolean {
  return titleSlug(product.title) === requestedSlug;
}
