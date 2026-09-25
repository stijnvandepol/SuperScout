import { describe, expect, test } from "vitest";
import { normalizeTerm, offerMatches } from "@/lib/search";
import { parseReport, RateLimiter } from "@/lib/reports";
import { countBucket } from "@/lib/analytics";
import { provenanceLabel, STORE_META, STORE_ICON } from "@/lib/format";

const coffee = {
  title: "Douwe Egberts Aroma Rood koffiebonen 1 kg",
  brand: "Douwe Egberts",
  sourceCategoryRaw: "Koffie, thee",
  rawLabel: "2e halve prijs",
};

describe("zoeken", () => {
  test("elk woord moet ergens voorkomen, niet als één aaneengesloten stuk", () => {
    expect(offerMatches(coffee, "douwe koffiebonen")).toBe(true);
    expect(offerMatches(coffee, "  KOFFIE   rood ")).toBe(true);
    expect(offerMatches(coffee, "koffie thee pads")).toBe(false);
  });

  test("een lege term matcht alles", () => {
    expect(offerMatches(coffee, "   ")).toBe(true);
  });

  test("termen worden genormaliseerd en afgekapt", () => {
    expect(normalizeTerm("  Robijn   Wasmiddel ")).toBe("robijn wasmiddel");
    expect(normalizeTerm("x".repeat(200))).toHaveLength(60);
  });
});

describe("meldingen", () => {
  const now = new Date("2026-10-01T12:34:56.789Z");
  const known = (id: string) => id === "ah:123";

  test("een geldige melding bewaart alleen wat nodig is, tot op de minuut", () => {
    expect(parseReport({ offerId: "ah:123", reason: "verlopen", note: "  al weg \n\n uit schap " }, known, now)).toEqual({
      offerId: "ah:123",
      reason: "verlopen",
      note: "al weg uit schap",
      at: "2026-10-01T12:34Z",
    });
  });

  test("onbekende aanbiedingen, redenen en te lange toelichtingen worden geweigerd", () => {
    expect(parseReport({ offerId: "ah:999", reason: "verlopen" }, known, now)).toBe("onbekende aanbieding");
    expect(parseReport({ offerId: "../../etc", reason: "verlopen" }, known, now)).toBe("onbekende aanbieding");
    expect(parseReport({ offerId: "ah:123", reason: "spam" }, known, now)).toBe("kies een reden");
    expect(typeof parseReport({ offerId: "ah:123", reason: "anders", note: "x".repeat(501) }, known, now)).toBe("string");
    expect(parseReport(null, known, now)).toBe("ongeldig verzoek");
  });

  test("de limiter laat een handvol toe en vergeet na het venster", () => {
    const limiter = new RateLimiter(2, 1_000);
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("a", 10)).toBe(true);
    expect(limiter.allow("a", 20)).toBe(false);
    expect(limiter.allow("b", 20)).toBe(true);
    expect(limiter.allow("a", 1_500)).toBe(true);
  });
});

describe("analytics", () => {
  test("aantallen worden grof ingedeeld, zodat een event geen vingerafdruk is", () => {
    expect([0, 1, 5, 6, 20, 21, 900].map(countBucket)).toEqual(["0", "1-5", "1-5", "6-20", "6-20", "20+", "20+"]);
  });
});

describe("winkelgegevens komen uit het register", () => {
  test("presentatie en iconen volgen core", () => {
    expect(STORE_META.ah.name).toBe("Albert Heijn");
    expect(STORE_META.kruidvat.sector).toBe("drogisterij");
    expect(STORE_ICON.ah).toBe("/store-icons/ah.png");
    expect(STORE_ICON.kruidvat).toBeUndefined();
  });

  test("de bron wordt in gewone taal benoemd", () => {
    expect(provenanceLabel({ source: "ah" })).toBe("Website van Albert Heijn");
    expect(provenanceLabel({ source: "kruidvat", provenance: "partner-feed" })).toBe("Aangeleverd door Kruidvat");
    expect(provenanceLabel({ source: "hema", provenance: "manual" })).toBe("Handmatig ingevoerd");
  });
});
