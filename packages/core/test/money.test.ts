import { describe, expect, test } from "vitest";
import { computeSavings, eurosToCents } from "../src/money";

describe("eurosToCents", () => {
  test("converts whole and fractional euros to integer cents", () => {
    expect(eurosToCents(0.99)).toBe(99);
    expect(eurosToCents(2.79)).toBe(279);
    expect(eurosToCents(10)).toBe(1000);
  });

  test("rounds correctly despite float imprecision (0.99 * 100 = 98.999...)", () => {
    expect(eurosToCents(5.78)).toBe(578);
    expect(eurosToCents(1.79)).toBe(179);
  });
});

describe("computeSavings", () => {
  test("computes absolute and percentage savings", () => {
    // 2.79 -> 0.99 : save 1.80, i.e. 65%
    expect(computeSavings(99, 279)).toEqual({ absoluteCents: 180, percent: 65 });
  });

  test("rounds the percentage to a whole number", () => {
    // 2.29 -> 1.79 : save 0.50 of 2.29 = 21.83% -> 22
    expect(computeSavings(179, 229)).toEqual({ absoluteCents: 50, percent: 22 });
  });

  test("returns nulls when there is no reference price", () => {
    expect(computeSavings(299, null)).toEqual({ absoluteCents: null, percent: null });
    expect(computeSavings(299, 0)).toEqual({ absoluteCents: null, percent: null });
  });

  test("returns nulls when the current price is unknown", () => {
    expect(computeSavings(null, 279)).toEqual({ absoluteCents: null, percent: null });
  });
});
