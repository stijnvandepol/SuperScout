import { describe, expect, test, vi } from "vitest";
import type { Product } from "@superscout/core";
import { crawlAhAssortment } from "../src/assortment-runner";
import { AH_AISLES } from "../src/adapters/ah/ah.taxonomy";
import { SqliteProductStore } from "../src/store/sqlite-product-store";
import type { AhAssortmentSource } from "../src/adapters/ah/ah.assortment";

function product(id: string, fetchedAt: string): Product {
  return {
    id: `ah:${id}`,
    source: "ah",
    sourceProductId: id,
    title: `Product ${id}`,
    priceCents: 199,
    fetchedAt,
  };
}

/** Stands in for the real crawler; `failOn` makes one aisle blow up. */
function fakeSource(
  opts: { perAisle?: number; failOn?: string; partialOn?: string; fetchedAt?: string } = {},
) {
  const at = opts.fetchedAt ?? new Date(Date.now() + 60_000).toISOString();
  let n = 0;
  return {
    fetchTaxonomy: vi.fn(async (_id: number, label = "") => {
      if (opts.failOn === label) throw new Error("aisle kapot");
      const products = Array.from({ length: opts.perAisle ?? 2 }, () => product(String(n++), at));
      return { products, complete: opts.partialOn !== label };
    }),
  } as unknown as AhAssortmentSource;
}

describe("crawlAhAssortment", () => {
  test("walks every aisle and stores what it finds", async () => {
    const store = new SqliteProductStore(":memory:");
    const report = await crawlAhAssortment(store, { source: fakeSource({ perAisle: 3 }) });

    expect(report.aisles).toBe(AH_AISLES.length);
    expect(report.aislesFailed).toBe(0);
    expect(report.products).toBe(AH_AISLES.length * 3);
    expect(await store.count("ah")).toBe(AH_AISLES.length * 3);
    await store.close();
  });

  test("one broken aisle does not stop the rest", async () => {
    const store = new SqliteProductStore(":memory:");
    const report = await crawlAhAssortment(store, {
      source: fakeSource({ failOn: "kaas" }),
    });

    expect(report.aislesFailed).toBe(1);
    expect(report.errors[0]?.aisle).toBe("kaas");
    expect(report.aisles).toBe(AH_AISLES.length - 1);
    expect(await store.count("ah")).toBeGreaterThan(0);
    await store.close();
  });

  test("a complete crawl prunes what vanished from the catalogue", async () => {
    const store = new SqliteProductStore(":memory:");
    // Left over from an earlier pass, and not returned this time.
    await store.upsertMany([product("delisted", "2020-01-01T00:00:00.000Z")]);

    const report = await crawlAhAssortment(store, { source: fakeSource() });

    expect(report.pruned).toBe(1);
    expect(await store.get("ah:delisted")).toBeUndefined();
    await store.close();
  });

  test("a partial crawl prunes nothing", async () => {
    // The dangerous case: pruning after a failure would delete every aisle the
    // crawl never reached.
    const store = new SqliteProductStore(":memory:");
    await store.upsertMany([product("delisted", "2020-01-01T00:00:00.000Z")]);

    const report = await crawlAhAssortment(store, {
      source: fakeSource({ failOn: "vlees" }),
    });

    expect(report.pruned).toBe(0);
    expect(await store.get("ah:delisted")).toBeDefined();
    await store.close();
  });

  test("a partial aisle is stored but still blocks the prune", async () => {
    // The failure mode this exists for: AH's gateway errors deep into a large
    // aisle, and throwing away 3.000 already-fetched products is worse than
    // keeping them. Keeping them must not licence a prune, though.
    const store = new SqliteProductStore(":memory:");
    await store.upsertMany([product("delisted", "2020-01-01T00:00:00.000Z")]);

    const report = await crawlAhAssortment(store, {
      source: fakeSource({ partialOn: "kaas" }),
    });

    expect(report.aislesFailed).toBe(1);
    expect(report.pruned).toBe(0);
    expect(await store.get("ah:delisted")).toBeDefined();
    // The partial aisle's products still landed.
    expect(report.products).toBeGreaterThan(0);
    await store.close();
  });

  test("reports progress per aisle", async () => {
    const store = new SqliteProductStore(":memory:");
    const lines: string[] = [];
    await crawlAhAssortment(store, {
      source: fakeSource(),
      onProgress: (l) => lines.push(l),
    });

    expect(lines.some((l) => l.includes("kaas"))).toBe(true);
    expect(lines.at(-1)).toMatch(/klaar: \d+ producten/);
    await store.close();
  });
});
