import { describe, expect, test } from "vitest";
import { normalizeDekamarktOffer } from "../src/adapters/dekamarkt/dekamarkt.normalize";
import type { DekamarktRawOffer } from "../src/adapters/dekamarkt/dekamarkt.raw";

const FETCHED = "2026-07-03T09:00:00.000Z";

function raw(over: Partial<DekamarktRawOffer> = {}): DekamarktRawOffer {
  return { id: "135963", title: "Del Monte Bananen", currentPrice: "0.99", oldPrice: "1.99", ...over };
}

describe("normalizeDekamarktOffer", () => {
  test("maps a current + old price to a price_drop", () => {
    const o = normalizeDekamarktOffer(raw(), FETCHED);
    expect(o.id).toBe("dekamarkt:135963");
    expect(o.source).toBe("dekamarkt");
    expect(o.title).toBe("Del Monte Bananen");
    expect(o.pricing.currentPriceCents).toBe(99);
    expect(o.pricing.originalPriceCents).toBe(199);
    expect(o.pricing.savingsAbsoluteCents).toBe(100);
    expect(o.mechanism).toEqual({ type: "price_drop" });
    expect(o.url).toBe("https://www.dekamarkt.nl/aanbiedingen");
  });

  test("parses comma-decimal prices", () => {
    const o = normalizeDekamarktOffer(raw({ currentPrice: "8,99", oldPrice: "12,25" }), FETCHED);
    expect(o.pricing.currentPriceCents).toBe(899);
    expect(o.pricing.originalPriceCents).toBe(1225);
  });

  test("reads a 1+1 gratis label as buy_x_get_y_free", () => {
    const o = normalizeDekamarktOffer(raw({ label: "1+1 GRATIS", oldPrice: undefined }), FETCHED);
    expect(o.mechanism).toEqual({ type: "buy_x_get_y_free", buyQuantity: 1, freeQuantity: 1 });
  });

  test("is unknown without an old price or recognised label", () => {
    const o = normalizeDekamarktOffer(raw({ label: "ACTIE!", oldPrice: undefined }), FETCHED);
    expect(o.mechanism).toEqual({ type: "unknown" });
  });

  test("keeps the addition as description and label as rawLabel", () => {
    const o = normalizeDekamarktOffer(raw({ addition: "Stuk 750 gram.", label: "ACTIE!" }), FETCHED);
    expect(o.description).toBe("Stuk 750 gram.");
    expect(o.rawLabel).toBe("ACTIE!");
  });
});
