/**
 * A raw DekaMarkt offer scraped from the DOM of dekamarkt.nl/aanbiedingen.
 * The offer-price box renders "{unit label}{current}{old}" with the old price in
 * a `.regular-strike`; the current price is reconstructed as the last price
 * token once the strike value is removed.
 */
export interface DekamarktRawOffer {
  /** `data-product-id`. */
  id: string;
  title: string;
  /** `.addition` — e.g. "Los.", "Stuk 750 gram.". */
  addition?: string;
  /** Label prefix before the prices — e.g. "ACTIE!", "PER KILO 0,99". */
  label?: string;
  currentPrice: string;
  oldPrice?: string;
  image?: string;
}
