/**
 * Shapes of Plus's OutSystems promotion endpoint
 * (`POST /screenservices/ECP_Composition_CW/Promotions/.../DataActionGetPromotionList_Optimization`).
 * We read the canonical per-category offer lists
 * (`data.PromotionOfferList.List[].Category.Offers.List[]`); banner highlight
 * tiles are intentionally ignored (they duplicate category offers).
 *
 * Prices are dot-decimal strings ("2.99", "0.0"); "0.0" means "not set".
 */

export interface PlusRawOffer {
  PromotionID: string;
  Offer_Id: string;
  Brand: string;
  Name: string;
  Example: string;
  Variant: string;
  Slug: string;
  ImageURL: string;
  NewPrice: string;
  PriceOriginal_Product: string;
  PriceOriginal_Highest: string;
  PriceOriginal_Lowest: string;
  /** e.g. "1+1 GRATIS", "2 VOOR 4.99", "25 % KORTING", "1.00 KORTING", "". */
  DisplayInfo_Label: string;
  StartDate: string;
  EndDate: string;
  IsFreeDeliveryOffer: boolean;
  IsSingleProduct: boolean;
  IsProductOverMajorityAge: boolean;
  Product_IsNIX18: boolean;
  Product_SKU: string;
}

export interface PlusCategory {
  CategoryId: string;
  CategoryLabel: string;
  Offers: { List: PlusRawOffer[] };
}

export interface PlusPromotionGroup {
  Category: PlusCategory;
}

export interface PlusPromotionListResponse {
  data: {
    PromotionOfferList: { List: PlusPromotionGroup[] };
  };
}
