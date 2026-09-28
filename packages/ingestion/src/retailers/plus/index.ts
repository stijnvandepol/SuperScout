import { interceptJson } from "../../browser/intercept";
import { defineRetailer, withBrowser } from "../module";
import { PlusAdapter } from "./plus.adapter";
import type { PlusPromotionListResponse } from "./plus.raw";

const PLUS_OFFERS_URL = "https://www.plus.nl/aanbiedingen";

/**
 * The promotion list, recognised by shape rather than endpoint name.
 *
 * PLUS runs on OutSystems, whose screen-service actions carry generated names;
 * the adapter matched "DataActionGetPromotionList_Optimization" and failed on
 * every run after that name changed, while the payload stayed the same.
 */
export function isPlusPromotionList(_url: string, body: unknown): boolean {
  const list = (body as { data?: { PromotionOfferList?: { List?: unknown } } } | null)?.data
    ?.PromotionOfferList?.List;
  return Array.isArray(list);
}

/** PLUS: its own offers JSON, read through the page that requests it. */
export default defineRetailer({
  source: "plus",
  urls: [PLUS_OFFERS_URL],
  needs: "browser",
  create: ({ browser }) =>
    withBrowser("plus", browser, (b) =>
      new PlusAdapter(() => interceptJson<PlusPromotionListResponse>(b, PLUS_OFFERS_URL, isPlusPromotionList)),
    ),
});
