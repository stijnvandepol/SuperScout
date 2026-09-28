import { defineRetailer, withBrowser } from "../module";
import { AldiAdapter, ALDI_OFFERS_URL } from "./aldi.adapter";

/** ALDI: offers page read from the DOM; promotion dates from the JSON embedded in the page. */
export default defineRetailer({
  source: "aldi",
  urls: [ALDI_OFFERS_URL],
  needs: "browser",
  create: ({ browser }) => withBrowser("aldi", browser, (b) => new AldiAdapter(b)),
});
