import type { Offer, SourceAdapter } from "@superscout/core";
import type { JumboNuTabResponse } from "./jumbo.raw";
import { normalizeJumboPromotion } from "./jumbo.normalize";

const JUMBO_GRAPHQL_URL = "https://www.jumbo.com/api/graphql";

const PROMOTION_FIELDS = `id title subtitle group start { iso } end { iso } image url tags { text }`;

/** nuTab query — promotions live both directly in a section and, for the bulk
 *  of the catalog, grouped per aisle in `categories`. Fetch both. */
const NUTAB_QUERY = `query nuTab {
  activeTab: promotionTab(id: "actieprijs") {
    id
    runtimes {
      active
      sections {
        id
        title
        promotions { ${PROMOTION_FIELDS} }
        categories { title promotions { ${PROMOTION_FIELDS} } }
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
      // Jumbo rejects the query ("No client headers set") without these.
      "apollographql-client-name": "JUMBO_MOBILE-promotion",
      "apollographql-client-version": "33.10.0",
      "x-source": "JUMBO_MOBILE-promotion",
      origin: "capacitor://jumbo",
      "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15",
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

    const add = (offer: Offer) => {
      if (seen.has(offer.id)) return; // same promo can appear in multiple places
      seen.add(offer.id);
      offers.push(offer);
    };

    for (const runtime of data.data.activeTab.runtimes ?? []) {
      for (const section of runtime.sections ?? []) {
        for (const promo of section.promotions ?? []) {
          add(normalizeJumboPromotion(promo, fetchedAt));
        }
        for (const category of section.categories ?? []) {
          for (const promo of category.promotions ?? []) {
            add(normalizeJumboPromotion(promo, fetchedAt, category.title));
          }
        }
      }
    }
    return offers;
  }
}
