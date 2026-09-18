/**
 * Albert Heijn's top-level aisles.
 *
 * The GraphQL API exposes no taxonomy query, and ah.nl blocks both plain HTTP
 * and a headless browser. The ids come instead from AH's own category sitemap:
 *
 *   https://www.ah.nl/sitemaps/entities/products/categories.xml
 *
 * which lists 2.531 categories as `/producten/<id>/<slug>` — and that `<id>` is
 * exactly the `taxonomyId` `productSearch` accepts.
 *
 * Only the 25 top-level ones are listed. Crawling all 2.531 would re-fetch the
 * same products through every sub-aisle they appear in; the top level already
 * covers the catalogue, and each aisle stays well under the API's 10.000
 * result-window cap that makes a single unfiltered crawl impossible.
 *
 * `measured` is the product count observed on 2026-09-18, summing to 42.354.
 * It is documentation, not logic — nothing reads it — but a crawl returning
 * wildly fewer than this is a signal the API or the taxonomy moved.
 */

export interface AhAisle {
  id: number;
  slug: string;
  /** Products seen on 2026-09-18; for sanity-checking a crawl, not for logic. */
  measured: number;
}

export const AH_AISLES: AhAisle[] = [
  { id: 6401, slug: "groente-aardappelen", measured: 1174 },
  { id: 20885, slug: "fruit-verse-sappen", measured: 589 },
  { id: 1301, slug: "maaltijden-salades", measured: 862 },
  { id: 9344, slug: "vlees", measured: 1527 },
  { id: 1651, slug: "vis", measured: 681 },
  { id: 20128, slug: "vegetarisch-vegan-en-plantaardig", measured: 625 },
  { id: 5481, slug: "vleeswaren", measured: 1080 },
  { id: 1192, slug: "kaas", measured: 1179 },
  { id: 1730, slug: "zuivel-eieren", measured: 2033 },
  { id: 1355, slug: "bakkerij", measured: 1672 },
  { id: 4246, slug: "glutenvrij", measured: 401 },
  { id: 20824, slug: "borrel-chips-snacks", measured: 2753 },
  { id: 1796, slug: "pasta-rijst-wereldkeuken", measured: 2065 },
  { id: 6409, slug: "soepen-sauzen-kruiden-olie", measured: 3450 },
  { id: 20129, slug: "koek-snoep-chocolade", measured: 3041 },
  { id: 6405, slug: "ontbijtgranen-beleg", measured: 2264 },
  { id: 2457, slug: "tussendoortjes", measured: 1296 },
  { id: 5881, slug: "diepvries", measured: 1275 },
  { id: 1043, slug: "koffie-thee", measured: 1190 },
  { id: 20130, slug: "frisdrank-sappen-water", measured: 2108 },
  { id: 6406, slug: "bier-wijn-aperitieven", measured: 3321 },
  { id: 1045, slug: "drogisterij", measured: 3696 },
  { id: 11717, slug: "gezondheid-en-sport", measured: 1357 },
  { id: 1165, slug: "huishouden", measured: 1604 },
  { id: 18521, slug: "baby-en-kind", measured: 1111 },
];

/** What the aisles summed to when they were measured. */
export const AH_MEASURED_TOTAL = AH_AISLES.reduce((n, a) => n + a.measured, 0);
