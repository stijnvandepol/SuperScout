import { describe, expect, test } from "vitest";
import { EkoplazaAdapter, ekoplazaPageUrl } from "./ekoplaza.adapter";
import { isEkoplazaPromotion, normalizeEkoplazaProduct } from "./ekoplaza.normalize";
import type { EkoplazaProduct, EkoplazaSearchResponse } from "./ekoplaza.raw";
import fixture from "./fixtures/ekoplaza-acties.json" with { type: "json" };

const RESPONSE = fixture as EkoplazaSearchResponse;
const FETCHED_AT = "2026-09-28T17:20:00.000Z";
const products = (RESPONSE.categories ?? []).flatMap((c) => c.items ?? []).map((i) => i.product as EkoplazaProduct);
const byId = (id: string) => products.find((p) => p.id === id)!;

describe("normalizeEkoplazaProduct", () => {
  test("a percentage deal keeps both prices, the label and the promotion week", () => {
    const offer = normalizeEkoplazaProduct(byId("8002"), FETCHED_AT);
    expect(offer).toMatchObject({
      id: "ekoplaza:8002",
      source: "ekoplaza",
      title: "Bladerdeeg",
      brand: "Donaustrudel",
      rawLabel: "20% korting",
      mechanism: { type: "percentage_off", percent: 20 },
      pricing: { currentPriceCents: 311, originalPriceCents: 389, savingsAbsoluteCents: 78 },
      validFrom: "2026-09-23T00:00:00.000Z",
      validUntil: "2026-09-29T23:59:00.000Z",
      unit: "320 gram",
      sourceCategoryRaw: "KOELVERS",
      flags: { isOrganic: true },
      url: "https://www.ekoplaza.nl/producten/product/bladerdeeg-0001008002",
    });
  });

  test("the unit keeps its own word, lowercased", () => {
    expect(normalizeEkoplazaProduct(byId("98093"), FETCHED_AT).unit).toBe("500 ml");
  });

  test("an unstructured label with a lower price is a price drop", () => {
    const p = { ...byId("8002"), label: { name: "Kies & Mix|" } };
    expect(normalizeEkoplazaProduct(p, FETCHED_AT).mechanism).toEqual({ type: "price_drop" });
  });
});

describe("isEkoplazaPromotion", () => {
  test("a lapsed promotion in the listing (no active discount, no label) is left out", () => {
    expect(isEkoplazaPromotion(byId("98952"))).toBe(false);
    expect(isEkoplazaPromotion(byId("168203"))).toBe(true);
  });
});

describe("EkoplazaAdapter", () => {
  test("pages until a page is empty, skipping lapsed and duplicate products", async () => {
    const asked: string[] = [];
    const adapter = new EkoplazaAdapter(async (url) => {
      asked.push(url);
      return asked.length <= 2 ? RESPONSE : { categories: [] };
    }, () => FETCHED_AT);

    const offers = await adapter.fetchOffers();
    expect(offers.map((o) => o.sourceOfferId).sort()).toEqual(["168203", "8002", "98093"]);
    expect(asked).toEqual([ekoplazaPageUrl(1), ekoplazaPageUrl(2), ekoplazaPageUrl(3)]);
  });

  test("asks for the same query the offers page sends", () => {
    expect(ekoplazaPageUrl(2)).toBe(
      "https://www.ekoplaza.nl/api/search/multi/categories?offset=0&limit=50&baseFacetFilters=%5B%22acties%3Dtrue%22%5D&page=2&pageSize=24&webNodeId=1",
    );
  });
});
