import { defineRetailer, withBrowser } from "../module";
import { DekamarktAdapter, DEKAMARKT_OFFERS_URL } from "./dekamarkt.adapter";

/** DekaMarkt: Nuxt page read from the DOM; dates from its `__NUXT_DATA__` payload. */
export default defineRetailer({
  source: "dekamarkt",
  urls: [DEKAMARKT_OFFERS_URL],
  needs: "browser",
  create: ({ browser }) => withBrowser("dekamarkt", browser, (b) => new DekamarktAdapter(b)),
});
