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
  ["Frisdrank, sappen, koffie, thee", "frisdrank"],
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

  test("splits drinks by title even when the source lumps them together", () => {
    const drinks = "Frisdrank, sappen, koffie, thee";
    expect(categorizeOffer(offer(drinks, "Coca-Cola Zero 1,5L"))).toBe("frisdrank");
    expect(categorizeOffer(offer(drinks, "Douwe Egberts koffiebonen"))).toBe("koffie-thee");
    expect(categorizeOffer(offer(drinks, "Spa mineraalwater"))).toBe("water");
  });

  test("separates snoep/koek from chips", () => {
    expect(categorizeOffer(offer(undefined, "Verkade chocolade reep"))).toBe("snoep-koek");
    expect(categorizeOffer(offer(undefined, "Lay's chips naturel"))).toBe("snacks");
  });

  test("is 'overig' when nothing matches", () => {
    expect(categorizeOffer(offer(undefined, "OP=OP"))).toBe("overig");
  });

  // Every case below was an actual misclassification on live offer data: a
  // short category noun that also opens an unrelated word. They are the reason
  // the lexicon has a whole-word tier.
  const compoundTraps: Array<[string, CategorySlug]> = [
    ["Alle Rummo pasta", "pasta-rijst"], // not bier-wijn via "rum"
    ["Bloemkool", "groente-fruit"], // not sauzen-conserven via "bloem"
    ["Hamburgers", "vlees-vis"], // not kaas-vleeswaren via "ham"
    ["Kerstboom", "non-food"], // not groente-fruit via "kers"
    ["Vlaai", "brood"], // not zuivel via "vla"
    ["6 porties vla", "zuivel"], // the real "vla" still works
    ["Mini-jamón serrano", "kaas-vleeswaren"], // not ontbijt via "jam"
  ];

  test.each(compoundTraps)("does not mis-split %s", (title, expected) => {
    expect(categorizeOffer(offer(undefined, title))).toBe(expected);
  });

  // Dutch compounds routinely put the noun at the end, where a prefix match
  // cannot see it.
  const trailingNouns: Array<[string, CategorySlug]> = [
    ["Inktvisringen", "vlees-vis"],
    ["Ansjovisfilets", "vlees-vis"],
    ["IJsbergsla", "groente-fruit"],
    ["Zalmfilet met huid", "vlees-vis"],
  ];

  test.each(trailingNouns)("finds the noun inside %s", (title, expected) => {
    expect(categorizeOffer(offer(undefined, title))).toBe(expected);
  });

  test("keeps hyphenated vocabulary intact while exposing its parts", () => {
    expect(categorizeOffer(offer(undefined, "Make-up remover"))).toBe("drogisterij");
    expect(categorizeOffer(offer(undefined, "WC-eend toiletreiniger"))).toBe("huishouden");
    // "tonic" alone reads as frisdrank; the "gin" half has to win.
    expect(categorizeOffer(offer(undefined, "Gin-tonic"))).toBe("bier-wijn");
  });

  test("classifies ice cream ahead of dairy and sweets", () => {
    expect(categorizeOffer(offer("Diepvries", "Alle Magnum ijs"))).toBe("ijs");
    expect(categorizeOffer(offer("Diepvries", "Ben & Jerry's pints"))).toBe("ijs");
    expect(categorizeOffer(offer(undefined, "Slagroom"))).toBe("zuivel");
  });

  test("routes seasonal and household goods to non-food", () => {
    expect(categorizeOffer(offer("Non food", "Summerwaves familie zwembad"))).toBe("non-food");
    expect(categorizeOffer(offer(undefined, "Curver hobbykoffer"))).toBe("non-food");
    // Food rules still win over the deliberately generic non-food vocabulary.
    expect(categorizeOffer(offer("Non food", "Koekenpan met tomatensaus"))).toBe("sauzen-conserven");
  });

  test("classifies bare product titles from chains that publish no category", () => {
    const bare: Array<[string, CategorySlug]> = [
      ["Avocado's", "groente-fruit"],
      ["Hollandse bloemkool", "groente-fruit"],
      ["Rode paprika", "groente-fruit"],
      ["Blauwe bessen", "groente-fruit"],
      ["Edet keukenpapier", "huishouden"],
      ["Glorix bleek original", "huishouden"],
      ["Alle Pringles", "snacks"],
      ["Heinz of Wijko sauzen", "sauzen-conserven"],
    ];
    for (const [title, expected] of bare) {
      expect(categorizeOffer(offer(undefined, title)), title).toBe(expected);
    }
  });
});
