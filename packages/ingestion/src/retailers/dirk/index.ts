import { defineRetailer } from "../module";
import { DirkAdapter, DIRK_DEPARTMENTS } from "./dirk.adapter";

/** Dirk: public JSON offers API, one call per department. */
export default defineRetailer({
  source: "dirk",
  urls: DIRK_DEPARTMENTS.map((d) => `https://www.dirk.nl/api/offers/current/${d}`),
  needs: "http",
  create: () => new DirkAdapter(),
});
