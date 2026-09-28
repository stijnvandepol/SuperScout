/**
 * What Ekoplaza's own search API returns for its offers page
 * (`/api/search/multi/categories` with the `acties=true` facet), as captured
 * on 28 September 2026. Only the fields the normalizer reads are typed.
 */
export interface EkoplazaSearchResponse {
  categories?: EkoplazaCategory[];
}

export interface EkoplazaCategory {
  id: string;
  items?: { type: string; product?: EkoplazaProduct }[];
}

export interface EkoplazaProduct {
  id: string;
  name: string;
  url?: string;
  image?: string;
  /** Display label with a trailing "|": "15% korting|", "€ 1 korting|", "". */
  label?: { name?: string };
  price?: { inclTax?: number };
  originalPrice?: { inclTax?: number };
  discounts?: EkoplazaDiscount[];
  brand?: { name?: string };
  /** Loose key/value attributes; INHOUD + EENHEID give the content. */
  fields?: { code: string; value: string }[];
  group?: { Description?: string };
}

export interface EkoplazaDiscount {
  isActive: boolean;
  label?: string;
  /** Local time without zone: "2026-09-23 00:00:00". */
  startDate?: string;
  endDate?: string;
}
