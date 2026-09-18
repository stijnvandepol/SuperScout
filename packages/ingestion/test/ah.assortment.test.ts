import { describe, expect, test } from "vitest";
import {
  AhAssortmentSource,
  amountToCents,
  normalizeAhProduct,
  type AhRawProduct,
} from "../src/adapters/ah/ah.assortment";
import { AH_AISLES, AH_MEASURED_TOTAL } from "../src/adapters/ah/ah.taxonomy";

/** Shaped exactly as the live API returns it. */
const REAL: AhRawProduct = {
  id: 618268,
  title: "AH Smeuige pindakaas 2-pack",
  brand: "AH",
  salesUnitSize: "2 stuks",
  webPath: "/producten/product/wi618268/ah-smeuige-pindakaas-2-pack",
  category: "Ontbijtgranen, beleg/Pindakaas",
  price: {
    now: { amount: 7.16 },
    was: { amount: 7.38 },
    unitInfo: { price: { amount: 5.51 }, description: "KG" },
  },
  taxonomies: [{ id: 6405, name: "Ontbijtgranen, beleg", slug: "ontbijtgranen-beleg" }],
};

describe("normalizeAhProduct", () => {
  test("maps a catalogue entry onto a Product", () => {
    const p = normalizeAhProduct(REAL, 6405, "2026-09-18T05:00:00.000Z")!;

    expect(p.id).toBe("ah:618268");
    expect(p.source).toBe("ah");
    expect(p.sourceProductId).toBe("618268");
    expect(p.title).toBe("AH Smeuige pindakaas 2-pack");
    expect(p.priceCents).toBe(716);
    expect(p.priceBeforeBonusCents).toBe(738);
    expect(p.unitPriceCents).toBe(551);
    expect(p.unitPriceLabel).toBe("KG");
    expect(p.url).toBe("https://www.ah.nl/producten/product/wi618268/ah-smeuige-pindakaas-2-pack");
    expect(p.categoryPath).toBe("Ontbijtgranen, beleg/Pindakaas");
    expect(p.taxonomyId).toBe(6405);
  });

  test("an unchanged 'was' price is not recorded as a discount", () => {
    // AH returns `was` even when nothing is on promotion; storing it then would
    // invent a bonus on every product in the catalogue.
    const flat = { ...REAL, price: { now: { amount: 7.16 }, was: { amount: 7.16 } } };
    expect(normalizeAhProduct(flat, 6405, "x")!.priceBeforeBonusCents).toBeUndefined();
  });

  test("a product without a usable price still lands, priced null", () => {
    const priceless = { ...REAL, price: null };
    const p = normalizeAhProduct(priceless, 6405, "x")!;

    // 22 of 1179 products in the cheese aisle have no price; dropping them
    // would silently shrink the catalogue.
    expect(p.priceCents).toBeNull();
    expect(p.title).toBe(REAL.title);
  });

  test("records without an id or title are rejected", () => {
    expect(normalizeAhProduct({ ...REAL, title: "  " }, 1, "x")).toBeNull();
    expect(normalizeAhProduct({ ...REAL, id: undefined as never }, 1, "x")).toBeNull();
  });

  test("optional fields are omitted, never blank", () => {
    const bare: AhRawProduct = { id: 1, title: "Kaas", brand: null, salesUnitSize: null };
    const p = normalizeAhProduct(bare, 1192, "x")!;

    expect("brand" in p).toBe(false);
    expect("salesUnitSize" in p).toBe(false);
    expect("url" in p).toBe(false);
  });
});

describe("amountToCents", () => {
  test("converts euros to integer cents", () => {
    expect(amountToCents(7.16)).toBe(716);
    expect(amountToCents(0.99)).toBe(99);
    // Floating point: 8.37 * 100 is 836.9999... without rounding.
    expect(amountToCents(8.37)).toBe(837);
  });

  test("refuses values that cannot be a price", () => {
    expect(amountToCents(null)).toBeNull();
    expect(amountToCents(undefined)).toBeNull();
    expect(amountToCents(0)).toBeNull();
    expect(amountToCents(-1)).toBeNull();
    expect(amountToCents(Number.NaN)).toBeNull();
  });
});

describe("AhAssortmentSource", () => {
  /** Serves a two-page aisle, so paging is exercised without a network. */
  function fakeApi(pages: AhRawProduct[][]) {
    const calls: unknown[] = [];
    const fetcher = async (url: string, init: RequestInit) => {
      if (url.includes("mobile-auth")) {
        return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
      }
      const body = JSON.parse(String(init.body)) as { variables: { input: { page: number } } };
      calls.push(body.variables.input);
      const page = body.variables.input.page;
      return new Response(
        JSON.stringify({
          data: {
            productSearch: {
              page: { totalElements: pages.flat().length, totalPages: pages.length },
              products: pages[page] ?? [],
            },
          },
        }),
        { status: 200 },
      );
    };
    return { fetcher, calls };
  }

  test("follows every page of an aisle", async () => {
    const { fetcher, calls } = fakeApi([
      [{ ...REAL, id: 1 }, { ...REAL, id: 2 }],
      [{ ...REAL, id: 3 }],
    ]);
    const source = new AhAssortmentSource({ fetcher, throttleMs: 0 });

    const { products, complete } = await source.fetchTaxonomy(1192, "kaas");

    expect(products.map((p) => p.sourceProductId)).toEqual(["1", "2", "3"]);
    expect(complete).toBe(true);
    expect(calls).toHaveLength(2);
  });

  test("de-duplicates a product listed in several sub-aisles", async () => {
    const { fetcher } = fakeApi([[{ ...REAL, id: 7 }], [{ ...REAL, id: 7 }]]);
    const source = new AhAssortmentSource({ fetcher, throttleMs: 0 });

    expect((await source.fetchTaxonomy(1192)).products).toHaveLength(1);
  });

  test("a page that keeps failing yields a partial aisle, not an empty one", async () => {
    // AH's gateway returns "Subgraph errors redacted" deep into a large aisle.
    // Measured on a full crawl it took out the four biggest aisles entirely —
    // 13.500 products lost because one page in each failed after 30 good ones.
    let served = 0;
    const fetcher = async (url: string) => {
      if (url.includes("mobile-auth")) {
        return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
      }
      served += 1;
      // First page fine, everything after it broken however often we retry.
      if (served === 1) {
        return new Response(
          JSON.stringify({
            data: {
              productSearch: {
                page: { totalElements: 200, totalPages: 2 },
                products: [{ ...REAL, id: 1 }],
              },
            },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ errors: [{ message: "Subgraph errors redacted" }] }), {
        status: 200,
      });
    };

    const source = new AhAssortmentSource({ fetcher, throttleMs: 0 });
    const { products, complete } = await source.fetchTaxonomy(1192);

    expect(products).toHaveLength(1);
    expect(complete).toBe(false);
  });

  test("a failing page is retried before it counts as failed", async () => {
    let attempts = 0;
    const fetcher = async (url: string) => {
      if (url.includes("mobile-auth")) {
        return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
      }
      attempts += 1;
      if (attempts < 3) {
        return new Response(JSON.stringify({ errors: [{ message: "Subgraph errors redacted" }] }), {
          status: 200,
        });
      }
      return new Response(
        JSON.stringify({
          data: {
            productSearch: { page: { totalElements: 1, totalPages: 1 }, products: [{ ...REAL, id: 1 }] },
          },
        }),
        { status: 200 },
      );
    };

    const source = new AhAssortmentSource({ fetcher, throttleMs: 0 });
    const { products, complete } = await source.fetchTaxonomy(1192);

    expect(attempts).toBe(3);
    expect(complete).toBe(true);
    expect(products).toHaveLength(1);
  });

  test("reports progress so a three-minute crawl is observable", async () => {
    const { fetcher } = fakeApi([[{ ...REAL, id: 1 }], [{ ...REAL, id: 2 }]]);
    const seen: number[] = [];
    const source = new AhAssortmentSource({
      fetcher,
      throttleMs: 0,
      onProgress: (p) => seen.push(p.fetched),
    });

    await source.fetchTaxonomy(1192, "kaas");
    expect(seen).toEqual([1, 2]);
  });
});

describe("AH_AISLES", () => {
  test("covers the catalogue as measured", () => {
    expect(AH_AISLES).toHaveLength(25);
    expect(AH_MEASURED_TOTAL).toBe(42354);
  });

  test("every aisle id is unique", () => {
    expect(new Set(AH_AISLES.map((a) => a.id)).size).toBe(AH_AISLES.length);
  });
});
