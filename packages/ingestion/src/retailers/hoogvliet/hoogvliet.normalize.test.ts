import { describe, expect, test } from "vitest";
import { normalizeHoogvlietOffer } from "./hoogvliet.normalize";
import type { HoogvlietRawOffer } from "./hoogvliet.raw";

const FETCHED = "2026-07-02T09:00:00.000Z";

function raw(promoLabel: string, over: Partial<HoogvlietRawOffer> = {}): HoogvlietRawOffer {
  return { id: "202627175", title: "Johma salade", promoLabel, ...over };
}

describe("normalizeHoogvlietOffer", () => {
  test("reads a plain promo price", () => {
    const o = normalizeHoogvlietOffer(raw("per kuipje 1.99"), FETCHED);
    expect(o.id).toBe("hoogvliet:202627175");
    expect(o.source).toBe("hoogvliet");
    expect(o.pricing.currentPriceCents).toBe(199);
    expect(o.mechanism).toEqual({ type: "unknown" });
    expect(o.rawLabel).toBe("per kuipje 1.99");
  });

  test("parses 1+1 gratis", () => {
    const o = normalizeHoogvlietOffer(raw("1+1 gratis"), FETCHED);
    expect(o.mechanism).toEqual({ type: "buy_x_get_y_free", buyQuantity: 1, freeQuantity: 1 });
    expect(o.pricing.currentPriceCents).toBeNull();
  });

  test("parses '2 voor 3.00' as multi_buy", () => {
    const o = normalizeHoogvlietOffer(raw("2 voor 3.00"), FETCHED);
    expect(o.mechanism).toEqual({ type: "multi_buy", buyQuantity: 2, totalPriceCents: 300 });
  });

  test("parses a percentage discount", () => {
    const o = normalizeHoogvlietOffer(raw("25% korting"), FETCHED);
    expect(o.mechanism).toEqual({ type: "percentage_off", percent: 25 });
  });

  test("builds a clean product url and absolute image", () => {
    const o = normalizeHoogvlietOffer(
      raw("per kuipje 1.99", { image: "/INTERSHOP/static/x.jpg" }),
      FETCHED,
    );
    expect(o.url).toBe("https://www.hoogvliet.com/aanbiedingen/202627175");
    expect(o.imageUrl).toBe("https://www.hoogvliet.com/INTERSHOP/static/x.jpg");
  });
});

describe("tile prices from /aanbiedingen", () => {
  test("a 1+1 tile keeps its per-piece price and the struck-through regular price", () => {
    // Markup of 28 September 2026: "Daily Chef verse pasta of saus", 1+1 gratis,
    // struck 4.10 - 7.60, now 2.05 - 3.80 (euro and cent spans).
    const o = normalizeHoogvlietOffer(
      raw("1+1 gratis", { title: "Daily Chef verse pasta of saus", priceNow: "2. 05 - 3. 80", priceWas: "4.10" }),
      FETCHED,
    );
    expect(o.mechanism).toEqual({ type: "buy_x_get_y_free", buyQuantity: 1, freeQuantity: 1 });
    expect(o.pricing).toEqual({ currentPriceCents: 205, originalPriceCents: 410, savingsAbsoluteCents: 205, savingsPercent: 50 });
  });

  test("a regular price that is not higher is not a saving", () => {
    const o = normalizeHoogvlietOffer(raw("per stuk 1.99", { priceNow: "1. 99", priceWas: "1.99" }), FETCHED);
    expect(o.pricing.originalPriceCents).toBeNull();
    expect(o.pricing.currentPriceCents).toBe(199);
  });
});
