import type { Offer, SourceAdapter } from "@superscout/core";
import type { JumboNuTabResponse } from "./jumbo.raw";
import { normalizeJumboPromotion } from "./jumbo.normalize";

const JUMBO_GRAPHQL_URL = "https://www.jumbo.com/api/graphql";

/** Compact nuTab query — just the fields the normalizer consumes. */
const NUTAB_QUERY = `query nuTab {
  activeTab: promotionTab(id: "actieprijs") {
    id
    shortTitle
    runtimes {
      active
      start { iso }
      sections {
        id
        title
        promotions {
          id
          title
          subtitle
          group
          start { iso }
          end { iso }
          image
          url
          tags { text }
        }
      }
    }
  }
}`;

/** Fetches the nuTab response. Injectable so the adapter is testable without network. */
export type JumboFetcher = () => Promise<JumboNuTabResponse>;

const defaultFetcher: JumboFetcher = async () => {
  const res = await fetch(JUMBO_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "*/*",
      "apollographql-client-name": "JUMBO_MOBILE-promotion",
    },
    body: JSON.stringify({ operationName: "nuTab", query: NUTAB_QUERY, variables: {} }),
  });
  if (!res.ok) throw new Error(`Jumbo responded ${res.status}`);
  return res.json() as Promise<JumboNuTabResponse>;
};

export class JumboAdapter implements SourceAdapter {
  readonly source = "jumbo" as const;

  constructor(
    private readonly fetcher: JumboFetcher = defaultFetcher,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async fetchOffers(): Promise<Offer[]> {
    const fetchedAt = this.clock();
    const data = await this.fetcher();
    const offers: Offer[] = [];
    const seen = new Set<string>();

    for (const runtime of data.data.activeTab.runtimes ?? []) {
      for (const section of runtime.sections ?? []) {
        for (const promo of section.promotions ?? []) {
          const offer = normalizeJumboPromotion(promo, fetchedAt);
          if (seen.has(offer.id)) continue; // same promo can appear in multiple sections
          seen.add(offer.id);
          offers.push(offer);
        }
      }
    }
    return offers;
  }
}
