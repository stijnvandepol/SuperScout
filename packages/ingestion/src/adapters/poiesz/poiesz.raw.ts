/**
 * A raw Poiesz offer scraped from webwinkel.poiesz-supermarkten.nl/aanbiedingen.
 * The two card prices are a variant *range* (lowest–highest promo price), not
 * old/new — so we take the lowest as the "from" price and express the discount
 * through the promo label ("1+1 GRATIS", "30% KORTING").
 */
export interface PoieszRawOffer {
  id: string;
  title: string;
  /** Lowest promo price across variants (`.new-price-double__lowest`). */
  currentPrice: string;
  /** Promo label, e.g. "1+1 GRATIS", "30% KORTING". */
  promo?: string;
  image?: string;
  /** Relative detail path, e.g. "/aanbiedingen/126584". */
  url?: string;
}
