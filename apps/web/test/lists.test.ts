import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Offer } from "@superscout/core";

function offer(i: number): Offer {
  return {
    id: `dirk:${i}`,
    source: "dirk",
    sourceOfferId: String(i),
    title: `Product ${i}`,
    pricing: { currentPriceCents: 100, originalPriceCents: 200, savingsAbsoluteCents: 100, savingsPercent: i % 50 },
    mechanism: { type: "price_drop" },
    validFrom: "2020-01-01",
    validUntil: "2099-12-31",
    flags: {},
    fetchedAt: "2026-09-25T05:00:00.000Z",
  } as Offer;
}

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), "superscout-lists-"));
  const path = join(dir, "offers.json");
  writeFileSync(path, JSON.stringify(Array.from({ length: 60 }, (_, i) => offer(i))), "utf-8");
  process.env.OFFERS_PATH = path;
  vi.resetModules();
});

afterEach(() => {
  delete process.env.OFFERS_PATH;
});

describe("lijsten in delen laden", () => {
  test("de API gaat verder precies waar de pagina ophield", async () => {
    const { listOffers, FIRST_PAGE } = await import("@/lib/lists");
    const { GET } = await import("@/app/api/lijst/route");

    const all = listOffers("winkel", "dirk")!;
    expect(all).toHaveLength(60);

    const res = GET(new Request(`http://x/api/lijst?soort=winkel&slug=dirk&vanaf=${FIRST_PAGE}`));
    const body = (await res.json()) as { total: number; offers: { id: string }[] };
    expect(body.total).toBe(60);
    expect(body.offers.map((o) => o.id)).toEqual(all.slice(FIRST_PAGE).map((o) => o.id));
  });

  test("onzin wordt geweigerd, onbekende lijsten zijn 404", async () => {
    const { GET } = await import("@/app/api/lijst/route");
    expect(GET(new Request("http://x/api/lijst?soort=drop&slug=x")).status).toBe(400);
    expect(GET(new Request("http://x/api/lijst?soort=winkel&slug=../etc")).status).toBe(400);
    expect(GET(new Request("http://x/api/lijst?soort=actie&slug=bestaat-niet")).status).toBe(404);
  });
});
