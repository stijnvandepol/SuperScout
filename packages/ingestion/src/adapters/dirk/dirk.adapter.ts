import type { Offer, SourceAdapter } from "@superscout/core";
import type { DirkOffersResponse } from "./dirk.raw";
import { normalizeDirkOffer } from "./dirk.normalize";

/** Dirk exposes offers per "department", numbered 1..18 in the capture. */
export const DIRK_DEPARTMENTS = Array.from({ length: 18 }, (_, i) => i + 1);

const DIRK_OFFERS_URL = "https://www.dirk.nl/api/offers/current/";

/** Fetches a URL and returns parsed JSON. Injectable so the adapter is testable without network. */
export type JsonFetcher = (url: string) => Promise<unknown>;

const defaultFetcher: JsonFetcher = async (url) => {
  const res = await fetch(url, {
    headers: { accept: "application/json", "accept-language": "nl-NL,nl;q=0.9" },
  });
  if (!res.ok) throw new Error(`Dirk responded ${res.status} for ${url}`);
  return res.json();
};

export class DirkAdapter implements SourceAdapter {
  readonly source = "dirk" as const;

  constructor(
    private readonly fetcher: JsonFetcher = defaultFetcher,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async fetchOffers(): Promise<Offer[]> {
    const fetchedAt = this.clock();
    const offers: Offer[] = [];
    const seen = new Set<string>();

    for (const dept of DIRK_DEPARTMENTS) {
      const data = (await this.fetcher(DIRK_OFFERS_URL + dept)) as DirkOffersResponse;
      for (const raw of data.currentOffers ?? []) {
        const offer = normalizeDirkOffer(raw, fetchedAt);
        // Same offer can appear under multiple departments; de-duplicate by id.
        if (seen.has(offer.id)) continue;
        seen.add(offer.id);
        offers.push(offer);
      }
    }
    return offers;
  }
}
