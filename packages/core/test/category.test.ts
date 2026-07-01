import { describe, expect, test } from "vitest";
import { categorizeOffer, type CategorySlug } from "../src/category";
import type { Offer } from "../src/offer";

function offer(sourceCategoryRaw: string | undefined, title = "Iets"): Offer {
  return {
    id: "x:1",
    source: "plus",
    sourceOfferId: "1",
    title,
    ...(sourceCategoryRaw ? { sourceCategoryRaw } : {}),
    pricing: { currentPriceCents: null, originalPriceCents: null, savingsAbsoluteCents: null, savingsPercent: null },
    mechanism: { type: "price_drop" },
    validFrom: "2026-07-01",
    validUntil: "2026-07-07",
    flags: {},
    fetchedAt: "2026-07-01T12:00:00.000Z",
  };
}

const cases: Array<[string, CategorySlug]> = [
  ["Kaas, vleeswaren, tapas", "kaas-vleeswaren"],
  ["Vlees, kip, vis, vega", "vlees-vis"],
  ["Vis", "vlees-vis"],
  ["Zuivel, eieren, boter", "zuivel"],
  ["Ontbijtgranen, broodbeleg, tussendoor", "ontbijt"], // NOT brood, despite "brood"
  ["Brood, gebak, bakproducten", "brood"],
  ["Verse kant-en-klaarmaaltijden", "maaltijden"],
  ["Aardappelen, groente & fruit", "groente-fruit"],
  ["Groente, aardappelen", "groente-fruit"],
  ["Borrel, chips, snacks", "snacks"], // NOT bier-wijn, despite "borrel"
  ["Wijn, bier, sterke drank", "bier-wijn"],
  ["Frisdrank, sappen, koffie, thee", "dranken"],
  ["Pasta, rijst, internationale keuken", "pasta-rijst"],
  ["Soepen, conserven, sauzen, smaakmakers", "sauzen-conserven"],
  ["Drogisterij/Styling paste", "drogisterij"],
  ["Gratis bezorging", "overig"],
];

describe("categorizeOffer", () => {
  test.each(cases)("maps %s -> %s", (raw, expected) => {
    expect(categorizeOffer(offer(raw))).toBe(expected);
  });

  test("falls back to the title when there is no raw category (Jumbo)", () => {
    expect(categorizeOffer(offer(undefined, "Alle Valess vleesvervangers"))).toBe("vlees-vis");
  });

  test("is 'overig' when nothing matches", () => {
    expect(categorizeOffer(offer(undefined, "Alle Grand'Italia"))).toBe("overig");
  });
});
