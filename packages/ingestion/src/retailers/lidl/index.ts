import { defineRetailer, withBrowser } from "../module";
import { LidlAdapter, LIDL_OFFERS_URL } from "./lidl.adapter";

/** Lidl: server-rendered offers page, read from the DOM (no JSON source found yet). */
export default defineRetailer({
  source: "lidl",
  urls: [LIDL_OFFERS_URL],
  needs: "browser",
  create: ({ browser }) => withBrowser("lidl", browser, (b) => new LidlAdapter(b)),
});
