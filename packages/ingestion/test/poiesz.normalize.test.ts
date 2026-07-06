import { describe, expect, test } from "vitest";
import { normalizePoieszOffer } from "../src/adapters/poiesz/poiesz.normalize";
import type { PoieszRawOffer } from "../src/adapters/poiesz/poiesz.raw";

const FETCHED = "2026-07-06T09:00:00.000Z";

function raw(over: Partial<PoieszRawOffer> = {}): PoieszRawOffer {
  return { id: "126584", title: "Abrikozen schaal", currentPrice: "2.89", url: "/aanbiedingen/126584", ...over };
}

describe("normalizePoieszOffer", () => {
  test("takes the lowest price and parses 1+1 gratis", () => {
    const o = normalizePoieszOffer(raw({ promo: "1+1 GRATIS" }), FETCHED);
    expect(o.id).toBe("poiesz:126584");
    expect(o.source).toBe("poiesz");
    expect(o.pricing.currentPriceCents).toBe(289);
    expect(o.pricing.originalPriceCents).toBeNull();
    expect(o.mechanism).toEqual({ type: "buy_x_get_y_free", buyQuantity: 1, freeQuantity: 1 });
    expect(o.rawLabel).toBe("1+1 GRATIS");
    expect(o.url).toBe("https://webwinkel.poiesz-supermarkten.nl/aanbiedingen/126584");
  });

  test("parses a percentage discount", () => {
    const o = normalizePoieszOffer(raw({ currentPrice: "6,38", promo: "30% KORTING" }), FETCHED);
    expect(o.pricing.currentPriceCents).toBe(638);
    expect(o.mechanism).toEqual({ type: "percentage_off", percent: 30 });
  });

  test("is unknown without a recognised promo", () => {
    const o = normalizePoieszOffer(raw({ promo: undefined }), FETCHED);
    expect(o.mechanism).toEqual({ type: "unknown" });
  });

  test("fixes backslashes in the image url", () => {
    const o = normalizePoieszOffer(raw({ image: "https://files.poiesz-supermarkten.nl/files\\9\\8\\4" }), FETCHED);
    expect(o.imageUrl).toBe("https://files.poiesz-supermarkten.nl/files/9/8/4");
  });
});
