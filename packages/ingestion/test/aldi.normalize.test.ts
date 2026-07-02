import { describe, expect, test } from "vitest";
import { normalizeAldiOffer } from "../src/adapters/aldi/aldi.normalize";
import type { AldiRawOffer } from "../src/adapters/aldi/aldi.raw";

const FETCHED = "2026-07-02T09:00:00.000Z";

const base: AldiRawOffer = {
  id: "1219603",
  title: "Nederlandse komkommer",
  currentPrice: "0.49",
  discount: "-29%",
  unit: "Per stuk",
  url: "/product/nederlandse-komkommer-1219603.html",
  image: "https://s7g10.scene7.com/is/image/aldinord/x",
};

describe("normalizeAldiOffer", () => {
  test("maps a discount-only offer to percentage_off with the sale price", () => {
    const o = normalizeAldiOffer(base, FETCHED);
    expect(o.id).toBe("aldi:1219603");
    expect(o.source).toBe("aldi");
    expect(o.pricing.currentPriceCents).toBe(49);
    expect(o.pricing.originalPriceCents).toBeNull();
    expect(o.mechanism).toEqual({ type: "percentage_off", percent: 29 });
    expect(o.url).toBe("https://www.aldi.nl/product/nederlandse-komkommer-1219603.html");
  });

  test("prefers price_drop when a strikethrough old price is present", () => {
    const o = normalizeAldiOffer({ ...base, currentPrice: "6.49", oldPrice: "9.49" }, FETCHED);
    expect(o.pricing.currentPriceCents).toBe(649);
    expect(o.pricing.originalPriceCents).toBe(949);
    expect(o.pricing.savingsAbsoluteCents).toBe(300);
    expect(o.mechanism).toEqual({ type: "price_drop" });
  });

  test("is unknown when there is no discount or old price", () => {
    const o = normalizeAldiOffer({ ...base, discount: undefined, currentPrice: "2.49" }, FETCHED);
    expect(o.pricing.currentPriceCents).toBe(249);
    expect(o.mechanism).toEqual({ type: "unknown" });
  });

  test("parses comma-decimal prices", () => {
    const o = normalizeAldiOffer({ ...base, currentPrice: "1,49" }, FETCHED);
    expect(o.pricing.currentPriceCents).toBe(149);
  });
});
