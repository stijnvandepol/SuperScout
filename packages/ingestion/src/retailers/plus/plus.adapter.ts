import type { Offer, SourceAdapter } from "@superscout/core";
import type { PlusPromotionListResponse } from "./plus.raw";
import { normalizePlusOffer } from "./plus.normalize";

/** Fetches the promotion-list response. Injectable so the adapter is testable without network. */
export type PlusFetcher = () => Promise<PlusPromotionListResponse>;

const defaultFetcher: PlusFetcher = async () => {
  // Plus runs on OutSystems: a live POST needs an `x-csrftoken` header plus
  // `versionInfo.moduleVersion`/`apiVersion` harvested from the /aanbiedingen
  // page first. Left as an explicit follow-up rather than a silently-broken
  // implementation — inject a fetcher until the harvest step is built.
  throw new Error(
    "Plus live fetch not implemented: harvest x-csrftoken + moduleVersion from /aanbiedingen first, or inject a fetcher.",
  );
};

export class PlusAdapter implements SourceAdapter {
  readonly source = "plus" as const;

  constructor(
    private readonly fetcher: PlusFetcher = defaultFetcher,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async fetchOffers(): Promise<Offer[]> {
    const fetchedAt = this.clock();
    const data = await this.fetcher();
    const offers: Offer[] = [];
    const seen = new Set<string>();

    for (const group of data.data.PromotionOfferList.List ?? []) {
      const category = group.Category;
      if (!category) continue;
      for (const raw of category.Offers?.List ?? []) {
        const offer = normalizePlusOffer(raw, category.CategoryLabel, fetchedAt);
        if (seen.has(offer.id)) continue;
        seen.add(offer.id);
        offers.push(offer);
      }
    }
    return offers;
  }
}
