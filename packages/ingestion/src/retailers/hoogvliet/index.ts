import { defineRetailer, withBrowser } from "../module";
import { HoogvlietAdapter, HOOGVLIET_OFFERS_URL } from "./hoogvliet.adapter";

/** Hoogvliet: the public /aanbiedingen page, rendered in a browser. */
export default defineRetailer({
  source: "hoogvliet",
  urls: [HOOGVLIET_OFFERS_URL],
  needs: "browser",
  create: ({ browser }) => withBrowser("hoogvliet", browser, (b) => new HoogvlietAdapter(b)),
});
