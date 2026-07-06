/**
 * A raw Sligro offer scraped from sligro.nl/aanbiedingen. Sligro is a B2B
 * wholesaler — "Alle prijzen zijn in EUR en exclusief BTW" — so these prices
 * exclude VAT; the exVat store flag makes that explicit in the UI.
 */
export interface SligroRawOffer {
  id: string;
  title: string;
  /** Packaging unit, e.g. "Stazak 1 kg". */
  unit?: string;
  currentPrice: string;
  oldPrice?: string;
  /** Relative detail path, e.g. "/p.71742.html/...". */
  url?: string;
  image?: string;
}
