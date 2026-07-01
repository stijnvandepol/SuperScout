import { describe, expect, test } from "vitest";
import { parseAhMechanism } from "../src/adapters/ah/ah.mechanism";
import type { AhRawPromotionLabel } from "../src/adapters/ah/ah.raw";

const label = (over: Partial<AhRawPromotionLabel>): AhRawPromotionLabel => ({
  mechanism: "",
  count: null,
  freeCount: null,
  actualCount: null,
  amount: null,
  percentage: null,
  price: null,
  unit: null,
  deliveryType: null,
  defaultDescription: null,
  ...over,
});

describe("parseAhMechanism", () => {
  test('ONE_FREE "2e gratis" (count 2) -> buy 1 get 1 free', () => {
    expect(parseAhMechanism(label({ mechanism: "ONE_FREE", count: 2 }))).toEqual({
      type: "buy_x_get_y_free",
      buyQuantity: 1,
      freeQuantity: 1,
    });
  });

  test("ONE_FREE count 3 -> buy 2 get 1 free", () => {
    expect(parseAhMechanism(label({ mechanism: "ONE_FREE", count: 3 }))).toEqual({
      type: "buy_x_get_y_free",
      buyQuantity: 2,
      freeQuantity: 1,
    });
  });

  test("ONE_FREE honours an explicit freeCount", () => {
    expect(parseAhMechanism(label({ mechanism: "ONE_FREE", count: 3, freeCount: 2 }))).toEqual({
      type: "buy_x_get_y_free",
      buyQuantity: 1,
      freeQuantity: 2,
    });
  });

  test("FREE_DELIVERY_AMOUNT (€12) -> free_delivery with min spend in cents", () => {
    expect(parseAhMechanism(label({ mechanism: "FREE_DELIVERY_AMOUNT", amount: 12 }))).toEqual({
      type: "free_delivery",
      minSpendCents: 1200,
    });
  });

  test("generic and unsampled mechanisms fall back to unknown", () => {
    expect(parseAhMechanism(label({ mechanism: "BONUS" }))).toEqual({ type: "unknown" });
    expect(parseAhMechanism(label({ mechanism: "FREE_DELIVERY", count: 4 }))).toEqual({
      type: "unknown",
    });
    expect(parseAhMechanism(undefined)).toEqual({ type: "unknown" });
  });
});
