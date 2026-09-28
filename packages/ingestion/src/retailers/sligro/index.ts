import { defineRetailer, withBrowser } from "../module";
import { SligroAdapter, SLIGRO_OFFERS_URL } from "./sligro.adapter";

/** Sligro (wholesale, prices ex-VAT): client-rendered page read from the DOM; period from the page text. */
export default defineRetailer({
  source: "sligro",
  urls: [SLIGRO_OFFERS_URL],
  needs: "browser",
  create: ({ browser }) => withBrowser("sligro", browser, (b) => new SligroAdapter(b)),
});
