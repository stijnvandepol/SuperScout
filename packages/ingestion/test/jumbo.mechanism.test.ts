import { describe, expect, test } from "vitest";
import { parseJumboMechanism } from "../src/adapters/jumbo/jumbo.mechanism";

describe("parseJumboMechanism", () => {
  describe("percentage_off", () => {
    test('"25% korting"', () => {
      expect(parseJumboMechanism("25% korting")).toEqual({ type: "percentage_off", percent: 25 });
    });
    test("tolerates casing and spacing", () => {
      expect(parseJumboMechanism("  50 %  Korting ")).toEqual({
        type: "percentage_off",
        percent: 50,
      });
    });
  });

  describe("multi_buy", () => {
    test('"N voor X,YY" -> total in cents', () => {
      expect(parseJumboMechanism("2 voor 4,99")).toEqual({
        type: "multi_buy",
        buyQuantity: 2,
        totalPriceCents: 499,
      });
      expect(parseJumboMechanism("4 voor 10,00")).toEqual({
        type: "multi_buy",
        buyQuantity: 4,
        totalPriceCents: 1000,
      });
      expect(parseJumboMechanism("2 voor 3,99")).toEqual({
        type: "multi_buy",
        buyQuantity: 2,
        totalPriceCents: 399,
      });
    });
    test("handles a euro sign and whole-euro totals", () => {
      expect(parseJumboMechanism("3 voor €5")).toEqual({
        type: "multi_buy",
        buyQuantity: 3,
        totalPriceCents: 500,
      });
    });
  });

  describe("buy_x_get_y_free", () => {
    test('"X+Y gratis"', () => {
      expect(parseJumboMechanism("1+1 gratis")).toEqual({
        type: "buy_x_get_y_free",
        buyQuantity: 1,
        freeQuantity: 1,
      });
      expect(parseJumboMechanism("2+1 gratis")).toEqual({
        type: "buy_x_get_y_free",
        buyQuantity: 2,
        freeQuantity: 1,
      });
    });
    test("tolerates spaces around the plus", () => {
      expect(parseJumboMechanism("1 + 1 gratis")).toEqual({
        type: "buy_x_get_y_free",
        buyQuantity: 1,
        freeQuantity: 1,
      });
    });
  });

  describe("unknown fallback", () => {
    test("never throws and never loses data on unrecognised labels", () => {
      expect(parseJumboMechanism("mooie zomeractie")).toEqual({ type: "unknown" });
      expect(parseJumboMechanism("")).toEqual({ type: "unknown" });
      // A label family we have not sampled yet must not be guessed.
      expect(parseJumboMechanism("2e halve prijs")).toEqual({ type: "unknown" });
    });
  });
});
