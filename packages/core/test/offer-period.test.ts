import { describe, expect, test } from "vitest";
import { daysUntilExpiry, isActive, isExpired, isExpiringSoon } from "../src/offer-period";

describe("daysUntilExpiry", () => {
  test("counts a date-only validUntil through the end of that day", () => {
    // 07-07 end-of-day vs 07-07 morning -> still expires 'today' (1 day)
    expect(daysUntilExpiry("2026-07-07", "2026-07-07T08:00:00.000Z")).toBe(1);
    // a full week out
    expect(daysUntilExpiry("2026-07-07", "2026-07-01T12:00:00.000Z")).toBe(7);
  });

  test("is negative once expired", () => {
    expect(daysUntilExpiry("2026-07-07", "2026-07-09T00:00:00.000Z")).toBeLessThan(0);
  });

  test("is NaN for an unparseable date", () => {
    expect(Number.isNaN(daysUntilExpiry("nope", "2026-07-01T00:00:00.000Z"))).toBe(true);
  });
});

describe("isExpired", () => {
  test("true after the end of the last valid day", () => {
    expect(isExpired("2026-07-07", "2026-07-08T06:00:00.000Z")).toBe(true);
    expect(isExpired("2026-07-07", "2026-07-07T23:00:00.000Z")).toBe(false);
  });
});

describe("isExpiringSoon", () => {
  test("true within the threshold, false outside it", () => {
    expect(isExpiringSoon("2026-07-07", "2026-07-06T10:00:00.000Z")).toBe(true); // ~2 days
    expect(isExpiringSoon("2026-07-07", "2026-07-01T12:00:00.000Z")).toBe(false); // a week
  });

  test("expired offers are not 'expiring soon'", () => {
    expect(isExpiringSoon("2026-07-07", "2026-07-09T00:00:00.000Z")).toBe(false);
  });

  test("respects a custom threshold", () => {
    expect(isExpiringSoon("2026-07-07", "2026-07-04T12:00:00.000Z", 4)).toBe(true);
    expect(isExpiringSoon("2026-07-07", "2026-07-04T12:00:00.000Z", 1)).toBe(false);
  });
});

describe("isActive", () => {
  const now = "2026-07-03T12:00:00.000Z"; // a Friday mid-week

  test("true when today is within the period", () => {
    expect(isActive("2026-06-29", "2026-07-05", now)).toBe(true);
  });

  test("false for a next-week offer that hasn't started", () => {
    expect(isActive("2026-07-06", "2026-07-12", now)).toBe(false);
  });

  test("false for a past-week offer that has expired", () => {
    expect(isActive("2026-06-22", "2026-06-28", now)).toBe(false);
  });

  test("keeps offers with unreadable dates (fails open)", () => {
    expect(isActive("", "", now)).toBe(true);
    expect(isActive("nope", "nope", now)).toBe(true);
  });
});
