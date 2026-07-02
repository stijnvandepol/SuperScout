import { describe, expect, test } from "vitest";
import { normalizeHoogvlietOffer } from "../src/adapters/hoogvliet/hoogvliet.normalize";
import type { HoogvlietRawOffer } from "../src/adapters/hoogvliet/hoogvliet.raw";

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
