import { describe, expect, test } from "vitest";
import type { Offer } from "../src/offer";
import { daysSinceExpiry, mergeArchive, offerStatus } from "../src/offer-archive";

function offer(partial: Partial<Offer> & { id: string }): Offer {
  return {
    source: "dirk",
    sourceOfferId: partial.id.split(":")[1] ?? partial.id,
    title: "Test",
    pricing: {
      currentPriceCents: 199,
      originalPriceCents: null,
      savingsAbsoluteCents: null,
      savingsPercent: null,
    },
    mechanism: { type: "price_drop" },
    validFrom: "2026-07-01",
    validUntil: "2026-07-07",
    flags: {},
    fetchedAt: "2026-07-01T05:00:00.000Z",
    ...partial,
  } as Offer;
}

const NOW = "2026-08-20T09:00:00.000Z";

describe("mergeArchive", () => {
  test("keeps expired offers that the fresh pull no longer contains", () => {
    const previous = [offer({ id: "dirk:1", validUntil: "2026-08-11" })];
    const incoming = [offer({ id: "dirk:2", validUntil: "2026-08-25" })];

    expect(mergeArchive(previous, incoming, NOW).map((o) => o.id)).toEqual(["dirk:2", "dirk:1"]);
  });

  test("the incoming copy wins, so a corrected price overwrites the stored one", () => {
    const previous = [offer({ id: "dirk:1", pricing: { ...offer({ id: "x" }).pricing } })];
    const incoming = [
      offer({
        id: "dirk:1",
        pricing: {
          currentPriceCents: 149,
          originalPriceCents: 199,
          savingsAbsoluteCents: 50,
          savingsPercent: 25,
        },
      }),
    ];

    const merged = mergeArchive(previous, incoming, NOW);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.pricing.currentPriceCents).toBe(149);
  });

  test("prunes anything past the retention window", () => {
    const stale = offer({ id: "dirk:old", validUntil: "2026-01-01" });
    const recent = offer({ id: "dirk:new", validUntil: "2026-08-11" });

    expect(mergeArchive([stale, recent], [], NOW).map((o) => o.id)).toEqual(["dirk:new"]);
  });

  test("falls back to fetchedAt when the promotion has no end date", () => {
    // ~1 in 3 offers arrives without validUntil; without the fallback these
    // would either never be pruned or be pruned on the first pass.
    const undated = offer({ id: "dirk:undated", validUntil: "", fetchedAt: NOW });
    const undatedOld = offer({
      id: "dirk:undated-old",
      validUntil: "",
      fetchedAt: "2026-01-01T05:00:00.000Z",
    });

    const merged = mergeArchive([undated, undatedOld], [], NOW);
    expect(merged.map((o) => o.id)).toEqual(["dirk:undated"]);
  });

  test("respects a custom retention window", () => {
    const week = offer({ id: "dirk:1", validUntil: "2026-08-11" });
    expect(mergeArchive([week], [], NOW, 30)).toHaveLength(1);
    expect(mergeArchive([week], [], NOW, 5)).toHaveLength(0);
  });

  test("is deterministic — same input, same order", () => {
    const a = offer({ id: "dirk:a", validUntil: "2026-08-11" });
    const b = offer({ id: "dirk:b", validUntil: "2026-08-11" });
    expect(mergeArchive([a, b], [], NOW).map((o) => o.id)).toEqual(
      mergeArchive([b, a], [], NOW).map((o) => o.id),
    );
  });
});

describe("offerStatus", () => {
  test("separates expired, running and next-week promotions", () => {
    expect(offerStatus(offer({ id: "1", validUntil: "2026-08-11" }), NOW)).toBe("expired");
    expect(
      offerStatus(offer({ id: "2", validFrom: "2026-08-19", validUntil: "2026-08-25" }), NOW),
    ).toBe("active");
    expect(
      offerStatus(offer({ id: "3", validFrom: "2026-08-26", validUntil: "2026-09-01" }), NOW),
    ).toBe("upcoming");
  });
});

describe("daysSinceExpiry", () => {
  test("counts whole days since the end date", () => {
    expect(daysSinceExpiry(offer({ id: "1", validUntil: "2026-08-13" }), NOW)).toBe(7);
  });

  test("is zero while the promotion still runs", () => {
    expect(daysSinceExpiry(offer({ id: "1", validUntil: "2026-08-25" }), NOW)).toBe(0);
  });
});
