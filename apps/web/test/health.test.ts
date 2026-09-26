import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Offer } from "@superscout/core";

let dir: string;
const NOW = Date.parse("2026-09-26T12:00:00Z");

function offer(source: string, fetchedAt: string): Offer {
  return {
    id: `${source}:1`,
    source,
    sourceOfferId: "1",
    title: "Test",
    pricing: { currentPriceCents: 100, originalPriceCents: null, savingsAbsoluteCents: null, savingsPercent: null },
    mechanism: { type: "price_drop" },
    validFrom: "2020-01-01",
    validUntil: "2099-12-31",
    flags: {},
    fetchedAt,
  } as Offer;
}

function live(offers: Offer[], status?: unknown) {
  writeFileSync(join(dir, "offers.json"), JSON.stringify(offers));
  process.env.OFFERS_PATH = join(dir, "offers.json");
  if (status) {
    writeFileSync(join(dir, "status.json"), JSON.stringify(status));
    process.env.INGEST_STATUS_PATH = join(dir, "status.json");
  }
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "superscout-health-"));
  vi.resetModules();
});

afterEach(() => {
  delete process.env.OFFERS_PATH;
  delete process.env.INGEST_STATUS_PATH;
});

const ALL = ["ah", "jumbo", "lidl", "aldi", "plus", "dirk", "hoogvliet", "dekamarkt", "poiesz", "sligro"];

describe("gezondheid van de data", () => {
  test("verse data van alle ketens is gezond", async () => {
    live(ALL.map((s) => offer(s, "2026-09-26T05:00:00Z")));
    const { health } = await import("@/lib/health");
    const h = health(NOW);
    expect(h.ok).toBe(true);
    expect(h.dataAgeHours).toBe(7);
    expect(h.missingChains).toEqual([]);
  });

  test("oude data is een probleem, ook als de server gewoon antwoordt", async () => {
    live(ALL.map((s) => offer(s, "2026-09-24T05:00:00Z")));
    const { health } = await import("@/lib/health");
    expect(health(NOW).problems.join()).toMatch(/uur oud/);
  });

  test("de helft van de ketens kwijt, of geen browser, is een probleem", async () => {
    live([offer("ah", "2026-09-26T05:00:00Z"), offer("jumbo", "2026-09-26T05:00:00Z")], {
      startedAt: "",
      finishedAt: "2026-09-26T05:10:00Z",
      written: 2,
      browserError: "Chromium kon niet starten",
      results: [{ source: "dirk", ok: false, offerCount: 0, durationMs: 10, error: "403" }],
    });
    const { health } = await import("@/lib/health");
    const h = health(NOW);
    expect(h.ok).toBe(false);
    expect(h.failingSources).toEqual(["dirk"]);
    expect(h.problems.join()).toMatch(/ketens zonder aanbiedingen/);
    expect(h.problems.join()).toMatch(/browser/);
  });

  test("het endpoint geeft 503 als de data niet te vertrouwen is", async () => {
    live([]);
    const { GET } = await import("@/app/api/health/route");
    expect(GET().status).toBe(503);
  });
});
