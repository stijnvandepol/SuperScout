import { describe, expect, test } from "vitest";
import type { Offer } from "../src/offer";
import { cycleStart, cycleStartsBySource, promoWeek } from "../src/offer-cycle";

function on(validFrom: string, source = "ah"): Offer {
  return {
    id: `${source}:${validFrom}:${Math.random()}`,
    source,
    sourceOfferId: validFrom,
    title: "Test",
    pricing: {
      currentPriceCents: 199,
      originalPriceCents: null,
      savingsAbsoluteCents: null,
      savingsPercent: null,
    },
    mechanism: { type: "price_drop" },
    validFrom,
    validUntil: "",
    flags: {},
    fetchedAt: "2026-08-20T05:00:00.000Z",
  } as Offer;
}

// 2026-08-17 is a Monday, -19 a Wednesday, -23 a Sunday.
const MONDAY = "2026-08-17";
const WEDNESDAY = "2026-08-19";
const SUNDAY = "2026-08-23";

describe("cycleStart", () => {
  test("names the dominant start weekday", () => {
    const start = cycleStart(Array.from({ length: 8 }, () => on(MONDAY)));
    expect(start).toEqual({ weekday: 0, label: "maandag", share: 1 });
  });

  test("tolerates a minority second cycle, like Dirk's weekend deals", () => {
    const offers = [
      ...Array.from({ length: 12 }, () => on(WEDNESDAY)),
      ...Array.from({ length: 4 }, () => on(SUNDAY)),
    ];
    expect(cycleStart(offers)?.label).toBe("woensdag");
  });

  test("says nothing when no weekday dominates", () => {
    const offers = [
      ...Array.from({ length: 5 }, () => on(MONDAY)),
      ...Array.from({ length: 5 }, () => on(WEDNESDAY)),
    ];
    expect(cycleStart(offers)).toBeNull();
  });

  test("says nothing below the sample floor", () => {
    expect(cycleStart([on(MONDAY), on(MONDAY)])).toBeNull();
  });

  test("undated offers do not vote", () => {
    const offers = [...Array.from({ length: 6 }, () => on(MONDAY)), on(""), on("garbage")];
    expect(cycleStart(offers)?.share).toBe(1);
  });

  test("is timezone-independent — a date-only validFrom is read as UTC", () => {
    // Parsed locally in a UTC+2 zone this would land on the previous Sunday.
    expect(cycleStart(Array.from({ length: 6 }, () => on(MONDAY)))?.label).toBe("maandag");
  });
});

describe("cycleStartsBySource", () => {
  test("reports per chain and omits chains with too little data", () => {
    const offers = [
      ...Array.from({ length: 6 }, () => on(MONDAY, "ah")),
      ...Array.from({ length: 6 }, () => on(WEDNESDAY, "jumbo")),
      on(MONDAY, "sligro"),
    ];

    const starts = cycleStartsBySource(offers);
    expect(starts.get("ah")?.label).toBe("maandag");
    expect(starts.get("jumbo")?.label).toBe("woensdag");
    expect(starts.has("sligro")).toBe(false);
  });
});

describe("promoWeek", () => {
  // 2026-09-28 is the Monday that opens ISO week 40; -24 is the Wednesday of week 39.
  const MONDAY_WEEK_40 = new Date("2026-09-28T09:00:00Z");
  const TUESDAY_WEEK_40 = new Date("2026-09-29T09:00:00Z");
  const WEDNESDAY_WEEK_40 = new Date("2026-09-30T09:00:00Z");

  test("a Monday chain's folder carries today's week", () => {
    const ah = Array.from({ length: 8 }, () => on("2026-09-28"));
    expect(promoWeek(ah, MONDAY_WEEK_40)).toBe(40);
  });

  test("a Wednesday chain is still on last week's folder until Wednesday", () => {
    // The case the helper exists for: Jumbo on a Monday or Tuesday.
    const jumbo = Array.from({ length: 8 }, () => on("2026-09-24", "jumbo"));
    expect(promoWeek(jumbo, MONDAY_WEEK_40)).toBe(39);
    expect(promoWeek(jumbo, TUESDAY_WEEK_40)).toBe(39);
  });

  test("and moves on the day its new cycle starts", () => {
    const jumbo = Array.from({ length: 8 }, () => on("2026-09-30", "jumbo"));
    expect(promoWeek(jumbo, WEDNESDAY_WEEK_40)).toBe(40);
  });

  test("falls back to today's ISO week when the chain publishes no dates", () => {
    const undated = Array.from({ length: 8 }, () => on("", "aldi"));
    expect(promoWeek(undated, TUESDAY_WEEK_40)).toBe(40);
  });

  test("crosses the year boundary like the chains do", () => {
    // Wednesday 2026-12-30 starts a cycle in ISO week 53 of 2026; on Monday
    // 2027-01-04 (week 1) that folder is still running.
    const offers = Array.from({ length: 8 }, () => on("2026-12-30", "jumbo"));
    expect(promoWeek(offers, new Date("2027-01-04T09:00:00Z"))).toBe(53);
  });
});
