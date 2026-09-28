import { defineRetailer, withBrowser } from "../module";
import { HoogvlietAdapter, HOOGVLIET_OFFERS_URL } from "./hoogvliet.adapter";

/** Hoogvliet: Intershop catalogue page. Its robots.txt currently disallows this URL, so the gate skips it. */
export default defineRetailer({
  source: "hoogvliet",
  urls: [HOOGVLIET_OFFERS_URL],
  needs: "browser",
  create: ({ browser }) => withBrowser("hoogvliet", browser, (b) => new HoogvlietAdapter(b)),
});
