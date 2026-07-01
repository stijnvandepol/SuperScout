import { describe, expect, test } from "vitest";
import { parsePlusMechanism } from "../src/adapters/plus/plus.mechanism";

describe("parsePlusMechanism", () => {
  test('"N+M GRATIS" -> buy_x_get_y_free', () => {
    expect(parsePlusMechanism("1+1 GRATIS")).toEqual({
      type: "buy_x_get_y_free",
      buyQuantity: 1,
      freeQuantity: 1,
    });
    expect(parsePlusMechanism("2+3 GRATIS")).toEqual({
      type: "buy_x_get_y_free",
      buyQuantity: 2,
      freeQuantity: 3,
    });
  });

  test('"N VOOR X.YY" -> multi_buy (total in cents)', () => {
    expect(parsePlusMechanism("2 VOOR 4.99")).toEqual({
      type: "multi_buy",
      buyQuantity: 2,
      totalPriceCents: 499,
    });
    expect(parsePlusMechanism("6 VOOR 29.94")).toEqual({
      type: "multi_buy",
      buyQuantity: 6,
      totalPriceCents: 2994,
    });
  });

  test('"N % KORTING" -> percentage_off', () => {
    expect(parsePlusMechanism("25 % KORTING")).toEqual({ type: "percentage_off", percent: 25 });
    expect(parsePlusMechanism("60 % KORTING")).toEqual({ type: "percentage_off", percent: 60 });
  });

  test('"X.YY KORTING" -> amount_off', () => {
    expect(parsePlusMechanism("1.00 KORTING")).toEqual({ type: "amount_off", amountCents: 100 });
  });

  test('"GRATIS BEZORGING BIJ X.YY EURO" -> free_delivery', () => {
    expect(parsePlusMechanism("GRATIS BEZORGING BIJ 10.00 EURO")).toEqual({
      type: "free_delivery",
      minSpendCents: 1000,
    });
  });

  test("unstructured labels fall back to unknown", () => {
    expect(parsePlusMechanism("")).toEqual({ type: "unknown" });
    expect(parsePlusMechanism("0.99 PER KILO")).toEqual({ type: "unknown" });
    expect(parsePlusMechanism("300 GRAM 3.49")).toEqual({ type: "unknown" });
  });
});
