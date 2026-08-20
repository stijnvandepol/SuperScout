import { describe, expect, test } from "vitest";
import type { Offer } from "../src/offer";
import { cycleStart, cycleStartsBySource } from "../src/offer-cycle";

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
