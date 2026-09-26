import { describe, expect, test } from "vitest";
import { InMemoryOfferStore, type Offer, type SourceAdapter, type SupermarketSlug } from "@superscout/core";
import { runIngestion, type IngestionReport, type SourceResult } from "../src/runner";

function makeOffer(id: string, source: SupermarketSlug): Offer {
  return {
    id,
    source,
    sourceOfferId: id,
    title: id,
    pricing: { currentPriceCents: null, originalPriceCents: null, savingsAbsoluteCents: null, savingsPercent: null },
    mechanism: { type: "price_drop" },
    validFrom: "2026-07-01",
    validUntil: "2026-07-07",
    flags: {},
    fetchedAt: "2026-07-01T12:00:00.000Z",
  };
}

const stub = (source: SupermarketSlug, offers: Offer[]): SourceAdapter => ({
  source,
  fetchOffers: async () => offers,
});
const failing = (source: SupermarketSlug): SourceAdapter => ({
  source,
  fetchOffers: async () => {
    throw new Error("boom");
  },
});
const hanging = (source: SupermarketSlug): SourceAdapter => ({
  source,
  fetchOffers: () => new Promise<Offer[]>(() => {}),
});

function resultFor(report: IngestionReport, source: SupermarketSlug): SourceResult {
  const r = report.results.find((x) => x.source === source);
  if (!r) throw new Error(`no result for ${source}`);
  return r;
}

describe("runIngestion", () => {
  test("runs all adapters and upserts offers into the store", async () => {
    const store = new InMemoryOfferStore();
    const report = await runIngestion(
      [stub("dirk", [makeOffer("dirk:1", "dirk")]), stub("jumbo", [makeOffer("jumbo:2", "jumbo"), makeOffer("jumbo:3", "jumbo")])],
      store,
    );

    expect(report.totalOffers).toBe(3);
    expect(await store.size()).toBe(3);
    expect(resultFor(report, "jumbo").offerCount).toBe(2);
    expect(report.results.every((r) => r.ok)).toBe(true);
  });

  test("isolates a failing source without affecting the others", async () => {
    const store = new InMemoryOfferStore();
    const report = await runIngestion(
      [stub("dirk", [makeOffer("dirk:1", "dirk")]), failing("ah")],
      store,
    );

    expect(resultFor(report, "dirk").ok).toBe(true);
    const ah = resultFor(report, "ah");
    expect(ah.ok).toBe(false);
    expect(ah.error).toContain("boom");
    expect(ah.offerCount).toBe(0);
    // The healthy source still persisted.
    expect(await store.size()).toBe(1);
    expect(report.totalOffers).toBe(1);
  });

  test("times out a hanging source instead of blocking", async () => {
    const store = new InMemoryOfferStore();
    const report = await runIngestion(
      [stub("dirk", [makeOffer("dirk:1", "dirk")]), hanging("plus")],
      store,
      { timeoutMs: 20 },
    );

    expect(resultFor(report, "dirk").ok).toBe(true);
    const plus = resultFor(report, "plus");
    expect(plus.ok).toBe(false);
    expect(plus.error?.toLowerCase()).toContain("time");
    expect(await store.size()).toBe(1);
  });

  test("reports per-source duration using the injected clock", async () => {
    const store = new InMemoryOfferStore();
    let t = 1000;
    const now = () => (t += 5); // each call advances 5ms
    const report = await runIngestion([stub("dirk", [])], store, { now });
    expect(resultFor(report, "dirk").durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe("vangnet voor mechanismen", () => {
  test("een 'unknown' met een leesbaar label wordt in de runner herkend", async () => {
    const { InMemoryOfferStore } = await import("@superscout/core");
    const store = new InMemoryOfferStore();
    const adapter = {
      source: "ah" as const,
      fetchOffers: async () => [
        {
          id: "ah:1",
          source: "ah" as const,
          sourceOfferId: "1",
          title: "Alle Pampers luiers",
          pricing: { currentPriceCents: null, originalPriceCents: null, savingsAbsoluteCents: null, savingsPercent: null },
          mechanism: { type: "unknown" as const },
          rawLabel: "2+1 gratis",
          validFrom: "2026-09-22",
          validUntil: "2026-09-28",
          flags: {},
          fetchedAt: "2026-09-22T05:00:00Z",
        },
      ],
    };
    await runIngestion([adapter], store);
    expect((await store.get("ah:1"))?.mechanism).toEqual({ type: "buy_x_get_y_free", buyQuantity: 2, freeQuantity: 1 });
  });
});
