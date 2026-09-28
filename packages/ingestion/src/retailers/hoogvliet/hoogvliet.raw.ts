/**
 * A raw Hoogvliet offer scraped from the DOM of its Intershop aanbiedingen
 * catalog. The promo label carries either the offer price ("per kuipje 1.99")
 * or the mechanism ("1+1 gratis", "2 voor 3.00", "25% korting").
 */
export interface HoogvlietRawOffer {
  id: string;
  title: string;
  description?: string;
  /** `.promotion-short-title` text. */
  promoLabel: string;
  url?: string;
  image?: string;
}
