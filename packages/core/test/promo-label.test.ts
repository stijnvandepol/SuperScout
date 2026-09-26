import { describe, expect, test } from "vitest";
import { parsePromoLabel, refineMechanism } from "../src";

describe("parsePromoLabel — stapelacties zoals AH ze schrijft", () => {
  test.each([
    ["3 stuks 29.99", { type: "multi_buy", buyQuantity: 3, totalPriceCents: 2999 }],
    ["2 stuks voor 5", { type: "multi_buy", buyQuantity: 2, totalPriceCents: 500 }],
    ["voor 0,99", { type: "unknown" }], // a price, not a mechanism
    ["1 voor 2,50", { type: "unknown" }], // one item for a price is not a stack deal
    ["500 g", { type: "unknown" }],
  ])("%s", (label, expected) => {
    expect(parsePromoLabel(label)).toEqual(expected);
  });
});

describe("refineMechanism", () => {
  test("haalt een onbekend mechanisme uit het label", () => {
    const offer = { mechanism: { type: "unknown" as const }, rawLabel: "2+1 gratis" };
    expect(refineMechanism(offer).mechanism).toEqual({ type: "buy_x_get_y_free", buyQuantity: 2, freeQuantity: 1 });
  });

  test("laat een door de adapter bepaald mechanisme met rust", () => {
    const offer = { mechanism: { type: "price_drop" as const }, rawLabel: "25% korting" };
    expect(refineMechanism(offer)).toBe(offer);
  });

  test("zonder herkenbaar label blijft het onbekend", () => {
    const offer = { mechanism: { type: "unknown" as const }, rawLabel: "bonus" };
    expect(refineMechanism(offer)).toBe(offer);
  });
});
