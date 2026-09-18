import { describe, expect, test } from "vitest";
import {
  centsOf,
  JumboAssortmentSource,
  normalizeJumboProduct,
  type JumboRawProduct,
} from "../src/adapters/jumbo/jumbo.assortment";

/** Shaped exactly as the live API returns it. */
const REAL: JumboRawProduct = {
  sku: "746550DS",
  title: "Goudse Kaas Jong 48+ Plakken 400 g",
  brand: "Neutraal (merkloos)",
  subtitle: "400 g",
  image: "https://www.jumbo.com/dam-images/fit-in/360x360/Products/x.png",
  link: "/producten/goudse-kaas-jong-48-plakken-400-g-746550DS",
  category: "Vleeswaren, kaas en tapas",
  inAssortment: true,
  price: { price: 379, promoPrice: null },
};

describe("normalizeJumboProduct", () => {
  test("maps a catalogue entry onto a Product", () => {
    const p = normalizeJumboProduct(REAL, "2026-09-18T05:00:00.000Z")!;

    expect(p.id).toBe("jumbo:746550DS");
    expect(p.source).toBe("jumbo");
    expect(p.title).toBe("Goudse Kaas Jong 48+ Plakken 400 g");
    expect(p.priceCents).toBe(379);
    expect(p.salesUnitSize).toBe("400 g");
    expect(p.url).toBe("https://www.jumbo.com/producten/goudse-kaas-jong-48-plakken-400-g-746550DS");
  });

  test('"Neutraal (merkloos)" is not a brand', () => {
    // Jumbo writes this for unbranded items; putting it on the page would read
    // as if the product were made by a company called Neutraal.
    expect("brand" in normalizeJumboProduct(REAL, "x")!).toBe(false);
    expect(normalizeJumboProduct({ ...REAL, brand: "Calvé" }, "x")!.brand).toBe("Calvé");
  });

  test("a promotion price becomes the shelf price, the regular one the before", () => {
    // Jumbo's shape is the mirror of AH's: `price` stays the regular figure and
    // `promoPrice` is what you actually pay.
    const onPromo = { ...REAL, price: { price: 379, promoPrice: 299 } };
    const p = normalizeJumboProduct(onPromo, "x")!;

    expect(p.priceCents).toBe(299);
    expect(p.priceBeforeBonusCents).toBe(379);
  });

  test("an equal promo price records no discount", () => {
    const flat = { ...REAL, price: { price: 379, promoPrice: 379 } };
    expect(normalizeJumboProduct(flat, "x")!.priceBeforeBonusCents).toBeUndefined();
  });

  test("records without a sku or title are rejected", () => {
    expect(normalizeJumboProduct({ ...REAL, sku: "" }, "x")).toBeNull();
    expect(normalizeJumboProduct({ ...REAL, title: "  " }, "x")).toBeNull();
  });
});

describe("centsOf", () => {
  test("Jumbo already quotes cents, so it only guards", () => {
    expect(centsOf(379)).toBe(379);
    expect(centsOf(0)).toBeNull();
    expect(centsOf(null)).toBeNull();
    expect(centsOf(Number.NaN)).toBeNull();
  });
});

describe("searchTerms", () => {
  test("splits a compound category name", () => {
    // "Handzeep, handcreme" returns nothing from the relevance search while
    // "Handzeep" alone returns 43 products, so a comma has to be split on.
    expect(JumboAssortmentSource.searchTerms("Handzeep, handcrème")).toEqual([
      "Handzeep",
      "handcrème",
    ]);
  });

  test("leaves a simple name alone", () => {
    expect(JumboAssortmentSource.searchTerms("Zwarte thee")).toEqual(["Zwarte thee"]);
  });

  test("drops fragments too short to search usefully", () => {
    expect(JumboAssortmentSource.searchTerms("Bier, pils, ijs")).toEqual(["Bier", "pils", "ijs"]);
    expect(JumboAssortmentSource.searchTerms("Kaas, en")).toEqual(["Kaas"]);
  });
});

describe("JumboAssortmentSource", () => {
  function fakeApi(pages: JumboRawProduct[][], count = 0) {
    const terms: string[] = [];
    const fetcher = async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as {
        query: string;
        variables?: { input: { searchTerms: string; offSet: number } };
      };
      if (body.query.includes("categories")) {
        return new Response(
          JSON.stringify({ data: { categories: [{ id: "1", name: "Kaas" }, { id: "2", name: "PRODUCTEN" }] } }),
          { status: 200 },
        );
      }
      terms.push(body.variables!.input.searchTerms);
      const page = body.variables!.input.offSet / 100;
      return new Response(
        JSON.stringify({
          data: {
            searchProducts: { count: count || pages.flat().length, products: pages[page] ?? [] },
          },
        }),
        { status: 200 },
      );
    };
    return { fetcher, terms };
  }

  test("drops the synthetic root from the taxonomy", async () => {
    const { fetcher } = fakeApi([[]]);
    const source = new JumboAssortmentSource({ fetcher, throttleMs: 0 });

    expect(await source.categories()).toEqual([{ id: "1", name: "Kaas" }]);
  });

  test("skips products no longer in the assortment", async () => {
    // Delisted items still surface in search; a page for something the shop does
    // not carry promises a price nobody can pay.
    const { fetcher } = fakeApi([
      [{ ...REAL, sku: "A" }, { ...REAL, sku: "B", inAssortment: false }],
    ]);
    const source = new JumboAssortmentSource({ fetcher, throttleMs: 0 });

    const products = await source.fetchCategory("Kaas");
    expect(products.map((p) => p.sourceProductId)).toEqual(["A"]);
  });

  test("searches each part of a compound category once", async () => {
    const { fetcher, terms } = fakeApi([[{ ...REAL, sku: "A" }]]);
    const source = new JumboAssortmentSource({ fetcher, throttleMs: 0 });

    const products = await source.fetchCategory("Handzeep, handcrème");

    expect(terms).toEqual(["Handzeep", "handcrème"]);
    // The same product found under both terms appears once.
    expect(products).toHaveLength(1);
  });

  test("a short page ends the paging regardless of the reported count", async () => {
    // Bloomreach's `count` overstates what it will actually serve, so trusting
    // it alone would loop fetching empty pages.
    const { fetcher } = fakeApi([[{ ...REAL, sku: "A" }]], 9999);
    const source = new JumboAssortmentSource({ fetcher, throttleMs: 0 });

    expect(await source.fetchCategory("Kaas")).toHaveLength(1);
  });

  test("a GraphQL error surfaces rather than returning an empty category", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ errors: [{ message: "Bloomreach boos" }] }), { status: 200 });
    const source = new JumboAssortmentSource({ fetcher, throttleMs: 0 });

    await expect(source.fetchCategory("Kaas")).rejects.toThrow(/Bloomreach boos/);
  });
});
