import { describe, expect, test } from "vitest";
import { relatedOffers } from "../src/related";
import type { Offer } from "../src/offer";
import type { SupermarketSlug } from "../src/supermarket";

function offer(id: string, source: SupermarketSlug, title: string, brand?: string): Offer {
  return {
    id,
    source,
    sourceOfferId: id,
    title,
    ...(brand ? { brand } : {}),
    pricing: { currentPriceCents: null, originalPriceCents: null, savingsAbsoluteCents: null, savingsPercent: null },
    mechanism: { type: "price_drop" },
    validFrom: "2026-07-01",
    validUntil: "2026-07-07",
    flags: {},
    fetchedAt: "2026-07-01T12:00:00.000Z",
  };
}

const target = offer("dirk:1", "dirk", "Bonduelle mais", "Bonduelle");

describe("relatedOffers", () => {
  test("groups same-brand, cross-store alternatives, and related, mutually exclusive", () => {
    const all = [
      target,
      offer("ah:2", "ah", "Bonduelle bonen", "Bonduelle"), // same brand
      offer("jumbo:3", "jumbo", "Verse mais kolven", "Jumbo"), // similar (mais), other store
      offer("dirk:4", "dirk", "Mais blik voordeel", "Hak"), // similar (mais), same store -> related
      offer("plus:5", "plus", "Wasmiddel color", "Ariel"), // unrelated
    ];

    const { sameBrand, alternatives, related } = relatedOffers(target, all);

    expect(sameBrand.map((o) => o.id)).toEqual(["ah:2"]);
    expect(alternatives.map((o) => o.id)).toEqual(["jumbo:3"]);
    expect(related.map((o) => o.id)).toEqual(["dirk:4"]);
  });

  test("excludes the target itself and unrelated offers", () => {
    const all = [target, offer("plus:5", "plus", "Wasmiddel color", "Ariel")];
    const result = relatedOffers(target, all);
    expect(result.sameBrand).toEqual([]);
    expect(result.alternatives).toEqual([]);
    expect(result.related).toEqual([]);
  });

  test("a same-brand offer at another store is counted as same-brand, not alternative", () => {
    const all = [target, offer("ah:2", "ah", "Bonduelle erwten", "Bonduelle")];
    const { sameBrand, alternatives } = relatedOffers(target, all);
    expect(sameBrand.map((o) => o.id)).toEqual(["ah:2"]);
    expect(alternatives).toEqual([]);
  });
});
