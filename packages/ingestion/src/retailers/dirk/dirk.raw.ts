/**
 * Shapes of Dirk's `GET https://www.dirk.nl/api/offers/current/{departmentId}`
 * response, exactly as observed. These types live behind the adapter boundary
 * and never leak outward — the normalizer maps them to the shared `Offer`.
 */

export interface DirkRawLogo {
  description: string;
  position: number;
  link: string;
  image: string;
}

export interface DirkRawProductInformation {
  productId: number;
  headerText: string;
  packaging: string;
  image: string;
  department: string;
  webgroup: string;
  brand: string;
  logos: DirkRawLogo[];
}

export interface DirkRawProduct {
  productId: number;
  offerPrice: number;
  normalPrice: number;
  productInformation: DirkRawProductInformation;
  productOffer: { textPriceSign?: string } | null;
}

export interface DirkRawOffer {
  offerId: number;
  headerText: string;
  packaging: string;
  offerPrice: number;
  /** 0 means "no reference price given". */
  normalPrice: number;
  textPriceSign: string;
  image: string | null;
  startDate: string;
  endDate: string;
  disclaimerStartDate?: string;
  disclaimerEndDate?: string;
  /** Individual products under this offer; entries can be null. */
  products: Array<DirkRawProduct | null>;
}

export interface DirkOffersResponse {
  currentOffers: DirkRawOffer[];
}
