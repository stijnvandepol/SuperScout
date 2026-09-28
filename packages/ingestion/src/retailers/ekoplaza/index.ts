import { defineRetailer } from "../module";
import { EKOPLAZA_API_URL, EkoplazaAdapter, ekoplazaPageUrl } from "./ekoplaza.adapter";

/** Ekoplaza: the search API behind its own offers page, paged. */
export default defineRetailer({
  source: "ekoplaza",
  urls: [EKOPLAZA_API_URL, ekoplazaPageUrl(1)],
  needs: "http",
  create: () => new EkoplazaAdapter(),
});
