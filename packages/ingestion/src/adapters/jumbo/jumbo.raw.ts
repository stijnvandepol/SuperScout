/**
 * Shapes of Jumbo's `POST https://www.jumbo.com/api/graphql` `nuTab` operation
 * (the public weekaanbiedingen tab), as observed. Kept behind the adapter
 * boundary; the normalizer maps them to the shared `Offer`.
 *
 * Note: nuTab carries no old/new price — the promotion *tag* is the mechanism
 * (e.g. "2 voor 4,99", "1+1 gratis", "25% korting").
 */

export interface JumboIso {
  iso: string;
}

export interface JumboPromotionTag {
  text: string;
}

export interface JumboRawPromotion {
  id: string;
  title: string;
  subtitle?: string | null;
  /** "Week" | "Seizoen" — the promo duration bucket, not a product category. */
  group?: string | null;
  start: JumboIso;
  end: JumboIso;
  image?: string | null;
  /** Path like "/aanbiedingen/komkommers/3019199". */
  url?: string | null;
  tags: JumboPromotionTag[];
}

export interface JumboPromotionSection {
  id: string;
  title: string;
  promotions: JumboRawPromotion[];
}

export interface JumboPromotionRuntime {
  active: boolean;
  start?: JumboIso;
  sections: JumboPromotionSection[];
}

export interface JumboPromotionTab {
  id: string;
  shortTitle?: string;
  runtimes: JumboPromotionRuntime[];
}

export interface JumboNuTabResponse {
  data: {
    activeTab: JumboPromotionTab;
  };
}
