import type { Offer, SourceAdapter } from "@superscout/core";
import type { AhBonusPromotionsResponse } from "./ah.raw";
import { normalizeAhPromotion } from "./ah.normalize";

const AH_TOKEN_URL = "https://api.ah.nl/mobile-auth/v1/auth/token/anonymous";
const AH_GRAPHQL_URL = "https://api.ah.nl/graphql";

/** Compact FetchBonusPromotionCards query — the fields the normalizer consumes. */
const BONUS_PROMOTIONS_QUERY = `query FetchBonusPromotionCards {
  bonusPromotions(input: {}) {
    id
    hqId
    title
    subtitle
    category
    productCount
    webPath
    promotionType
    segmentType
    periodStart
    periodEnd
    rawPromotionLabels {
      mechanism
      count
      freeCount
      actualCount
      amount
      percentage
      price
      unit
      deliveryType
      defaultDescription
    }
    price { now { amount } was { amount } label }
    images { url title width height }
    exceptionRule
    extraDescriptions
  }
}`;

/** Fetches the bonusPromotions response. Injectable so the adapter is testable without network. */
export type AhFetcher = () => Promise<AhBonusPromotionsResponse>;

const defaultFetcher: AhFetcher = async () => {
  const tokenRes = await fetch(AH_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Appie/9.39" },
    body: JSON.stringify({ clientId: "appie" }),
  });
  if (!tokenRes.ok) throw new Error(`AH auth responded ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };

  const res = await fetch(AH_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${access_token}`,
      "user-agent": "Appie/9.39",
      "x-client-name": "appie-ios",
    },
    body: JSON.stringify({ operationName: "FetchBonusPromotionCards", query: BONUS_PROMOTIONS_QUERY }),
  });
  if (!res.ok) throw new Error(`AH responded ${res.status}`);
  return res.json() as Promise<AhBonusPromotionsResponse>;
};

export class AhAdapter implements SourceAdapter {
  readonly source = "ah" as const;

  constructor(
    private readonly fetcher: AhFetcher = defaultFetcher,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async fetchOffers(): Promise<Offer[]> {
    const fetchedAt = this.clock();
    const data = await this.fetcher();
    const offers: Offer[] = [];
    const seen = new Set<string>();

    for (const promo of data.data.bonusPromotions ?? []) {
      const offer = normalizeAhPromotion(promo, fetchedAt);
      if (seen.has(offer.id)) continue;
      seen.add(offer.id);
      offers.push(offer);
    }
    return offers;
  }
}
