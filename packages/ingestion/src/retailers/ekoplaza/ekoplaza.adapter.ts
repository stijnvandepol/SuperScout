import type { Offer, SourceAdapter } from "@superscout/core";
import { polite } from "../../http/polite";
import type { EkoplazaSearchResponse } from "./ekoplaza.raw";
import { isEkoplazaPromotion, normalizeEkoplazaProduct } from "./ekoplaza.normalize";

/** The search API Ekoplaza's own offers page calls, page by page. */
export const EKOPLAZA_API_URL = "https://www.ekoplaza.nl/api/search/multi/categories";

/** The same query the offers page sends; only `page` changes. */
export function ekoplazaPageUrl(page: number): string {
  const facets = encodeURIComponent(JSON.stringify(["acties=true"]));
  return `${EKOPLAZA_API_URL}?offset=0&limit=50&baseFacetFilters=${facets}&page=${page}&pageSize=24&webNodeId=1`;
}

/** The capture showed seven pages; this is a ceiling, not an expectation. */
const MAX_PAGES = 25;

export type JsonFetcher = (url: string) => Promise<unknown>;

const defaultFetcher: JsonFetcher = async (url) => {
  const res = await polite(url, { headers: { accept: "application/json", "accept-language": "nl-NL,nl;q=0.9" } });
  if (!res.ok) throw new Error(`Ekoplaza antwoordde ${res.status} op ${url}`);
  return res.json();
};

export class EkoplazaAdapter implements SourceAdapter {
  readonly source = "ekoplaza" as const;

  constructor(
    private readonly fetcher: JsonFetcher = defaultFetcher,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async fetchOffers(): Promise<Offer[]> {
    const fetchedAt = this.clock();
    const offers = new Map<string, Offer>();
    for (let page = 1; page <= MAX_PAGES; page++) {
      const data = (await this.fetcher(ekoplazaPageUrl(page))) as EkoplazaSearchResponse;
      const products = (data.categories ?? []).flatMap((c) => c.items ?? []).flatMap((i) => (i.product ? [i.product] : []));
      if (!products.length) break;
      for (const p of products) {
        // A product can sit in several categories; keep the first.
        if (!isEkoplazaPromotion(p) || offers.has(p.id)) continue;
        offers.set(p.id, normalizeEkoplazaProduct(p, fetchedAt));
      }
    }
    return [...offers.values()];
  }
}
