import { describe, expect, test } from "vitest";
import { InMemoryOfferStore, type SupermarketSlug } from "@superscout/core";
import { runIngestion } from "../src/runner";
import { DirkAdapter } from "../src/adapters/dirk/dirk.adapter";
import { JumboAdapter } from "../src/adapters/jumbo/jumbo.adapter";
import { AhAdapter } from "../src/adapters/ah/ah.adapter";
import { PlusAdapter } from "../src/adapters/plus/plus.adapter";

import dirkFixture from "./fixtures/dirk-offers.json" with { type: "json" };
import jumboFixture from "./fixtures/jumbo-nutab.json" with { type: "json" };
import ahFixture from "./fixtures/ah-bonus-promotions.json" with { type: "json" };
import plusFixture from "./fixtures/plus-promotions.json" with { type: "json" };

const clock = () => "2026-07-01T12:00:00.000Z";

// Real captured fixtures wired through each adapter's injected fetcher — the
// whole pipeline, no network.
function allAdapters() {
  return [
    new DirkAdapter(async (url) => (url.endsWith("/1") ? dirkFixture : { currentOffers: [] }), clock),
    new JumboAdapter(async () => jumboFixture as never, clock),
    new AhAdapter(async () => ahFixture as never, clock),
    new PlusAdapter(async () => plusFixture as never, clock),
  ];
}

describe("end-to-end ingestion", () => {
  test("all four chains normalize into one store", async () => {
    const store = new InMemoryOfferStore();
    const report = await runIngestion(allAdapters(), store);

    expect(report.results.every((r) => r.ok)).toBe(true);
    expect(report.totalOffers).toBe(await store.size());

    const sources = new Set((await store.all()).map((o) => o.source));
    expect([...sources].sort()).toEqual<SupermarketSlug[]>(["ah", "dirk", "jumbo", "plus"]);
  });

  test("a single mechanism filter works across every chain (the taxonomy payoff)", async () => {
    const store = new InMemoryOfferStore();
    await runIngestion(allAdapters(), store);

    const bogo = await store.query({ mechanismType: "buy_x_get_y_free" });
    const bogoSources = new Set(bogo.map((o) => o.source));

    // "1+1 / Nth free" deals surface from multiple chains through one query,
    // despite three totally different upstream representations.
    expect(bogo.length).toBeGreaterThan(0);
    expect(bogoSources.size).toBeGreaterThanOrEqual(2);
  });
});
