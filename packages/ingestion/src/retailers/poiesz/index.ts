import { defineRetailer, withBrowser } from "../module";
import { PoieszAdapter, POIESZ_OFFERS_URL } from "./poiesz.adapter";

/** Poiesz: client-rendered Nuxt page read from the DOM; folder period from the payload. */
export default defineRetailer({
  source: "poiesz",
  urls: [POIESZ_OFFERS_URL],
  needs: "browser",
  create: ({ browser }) => withBrowser("poiesz", browser, (b) => new PoieszAdapter(b)),
});
