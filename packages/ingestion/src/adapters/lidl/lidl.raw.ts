/**
 * A raw Lidl offer as scraped from the DOM of lidl.nl/c/aanbiedingen. All fields
 * are the verbatim text of specific elements (`.ods-price__value`, the
 * strikethrough price, the discount badge, the validity badge), parsed later.
 */
export interface LidlRawOffer {
  /** Product code from the detail link, e.g. "p10029633". */
  id: string;
  title: string;
  description?: string;
  /** Sale price text, e.g. "6.49" or "1,49". */
  currentPrice: string;
  /** Strikethrough reference price text, if shown. */
  oldPrice?: string;
  /** Discount badge text, e.g. "-31%". */
  discount?: string;
  /** Pack/size text, e.g. "15-30 stuks". */
  pack?: string;
  /** Validity/availability badge, e.g. "Alleen in de winkel 29/06 - 05/07". */
  badge?: string;
  /** Relative detail-page path, e.g. "/p/nescafe-dolce-gusto/p10029633". */
  url?: string;
  image?: string;
}
