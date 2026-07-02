/**
 * A raw Aldi offer scraped from the DOM of aldi.nl/aanbiedingen.html. The sale
 * price comes from `.tag__label--price` specifically (NOT the sibling
 * `.tag__label`, which holds "-29%" or "OP=OP"), so we never mistake the
 * discount badge or per-kg base price for the price.
 */
export interface AldiRawOffer {
  id: string;
  title: string;
  brand?: string;
  /** Sale price text, e.g. "0.49" or "1,49". */
  currentPrice: string;
  /** Strikethrough reference price, if shown. */
  oldPrice?: string;
  /** Discount badge, e.g. "-29%". */
  discount?: string;
  /** Sales unit, e.g. "Per stuk", "100 g". */
  unit?: string;
  /** Relative detail path, e.g. "/product/snacktomaten-1219596.html". */
  url?: string;
  image?: string;
}
