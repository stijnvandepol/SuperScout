import { describe, expect, test } from "vitest";
import type { Offer } from "@superscout/core";
import { assessCount, heldOffers, parseHistory, type RunCounts } from "./source-health";

const NOW = "2026-09-28T05:00:00.000Z";
const run = (daysAgo: number, counts: Record<string, number>): RunCounts => ({
  at: new Date(Date.parse(NOW) - daysAgo * 86_400_000).toISOString(),
  counts,
});
const HISTORY = [run(6, { aldi: 211 }), run(4, { aldi: 237 }), run(2, { aldi: 220 }), run(1, { aldi: 0 })];

describe("assessCount", () => {
  test("een normale pull is goed", () => {
    expect(assessCount("aldi", 205, HISTORY, NOW)).toEqual({ ok: true });
  });

  test("nul terwijl er normaal ruim 200 zijn: verdacht, met de maat erbij", () => {
    expect(assessCount("aldi", 0, HISTORY, NOW)).toEqual({ ok: false, reason: "0 aanbiedingen, normaal rond 220" });
  });

  test("minder dan de helft van normaal: verdacht", () => {
    expect(assessCount("aldi", 90, HISTORY, NOW).ok).toBe(false);
    expect(assessCount("aldi", 120, HISTORY, NOW).ok).toBe(true);
  });

  test("zonder geschiedenis valt er niets te vergelijken", () => {
    expect(assessCount("kruidvat", 0, HISTORY, NOW)).toEqual({ ok: true });
  });

  test("te oude runs tellen niet mee", () => {
    expect(assessCount("aldi", 0, [run(30, { aldi: 211 })], NOW)).toEqual({ ok: true });
  });
});

describe("heldOffers", () => {
  const offer = (id: string, source: string, fetchedDaysAgo: number, validUntil: string): Offer =>
    ({
      id,
      source,
      sourceOfferId: id,
      title: id,
      pricing: { currentPriceCents: 100, originalPriceCents: null, savingsAbsoluteCents: null, savingsPercent: null },
      mechanism: { type: "price_drop" },
      validFrom: "2026-09-20",
      validUntil,
      flags: {},
      fetchedAt: new Date(Date.parse(NOW) - fetchedDaysAgo * 86_400_000).toISOString(),
    }) as Offer;

  test("alleen lopende, recente aanbiedingen van die keten blijven staan", () => {
    const kept = heldOffers(
      [
        offer("a", "aldi", 1, "2026-10-01"),
        offer("b", "aldi", 1, "2026-09-27"), // already ended
        offer("c", "aldi", 9, "2026-10-01"), // fetched too long ago
        offer("d", "lidl", 1, "2026-10-01"), // other chain
        offer("e", "aldi", 1, ""), // undated, but recent
      ],
      "aldi",
      NOW,
    );
    expect(kept.map((o) => o.id)).toEqual(["a", "e"]);
  });
});

test("een half weggeschreven regel breekt de geschiedenis niet", () => {
  expect(parseHistory('{"at":"2026-09-27","counts":{"aldi":1}}\n{"at":"2026-09-2')).toHaveLength(1);
});
