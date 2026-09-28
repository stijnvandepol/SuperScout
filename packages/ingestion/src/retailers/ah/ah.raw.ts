/**
 * Shapes of Albert Heijn's `FetchBonusPromotionCards` GraphQL operation
 * (`POST https://api.ah.nl/graphql`, Bearer-authenticated with an anonymous
 * token), as observed. Kept behind the adapter boundary.
 *
 * Unlike Jumbo, AH gives *structured* discount labels (`rawPromotionLabels`),
 * so the mechanism is mapped from fields, not parsed from text.
 */

export interface AhMoney {
  amount: number;
  formattedV2?: string | null;
}

export interface AhPromotionPrice {
  now: AhMoney | null;
  was: AhMoney | null;
  label: string | null;
}

export interface AhRawPromotionLabel {
  mechanism: string;
  count: number | null;
  freeCount: number | null;
  actualCount: number | null;
  amount: number | null;
  percentage: number | null;
  price: number | null;
  unit: string | null;
  deliveryType: string | null;
  defaultDescription: string | null;
}

export interface AhPromotionImage {
  url: string;
  title?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface AhRawPromotion {
  id: string;
  hqId: number | null;
  title: string;
  subtitle: string | null;
  category: string | null;
  productCount: number | null;
  webPath: string | null;
  promotionType: string | null;
  segmentType: string | null;
  /** Bonus period bounds, as date strings "YYYY-MM-DD". */
  periodStart: string;
  periodEnd: string;
  rawPromotionLabels: AhRawPromotionLabel[] | null;
  price: AhPromotionPrice | null;
  exceptionRule: string | null;
  extraDescriptions: string[] | null;
  images: AhPromotionImage[] | null;
}

export interface AhBonusPromotionsResponse {
  data: {
    bonusPromotions: AhRawPromotion[];
  };
}
