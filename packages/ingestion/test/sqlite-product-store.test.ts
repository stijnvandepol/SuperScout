import { describe, expect, test } from "vitest";
import type { Product } from "@superscout/core";
import { SqliteProductStore } from "../src/store/sqlite-product-store";

function product(partial: Partial<Product> & { sourceProductId: string }): Product {
  return {
    id: `ah:${partial.sourceProductId}`,
    source: "ah",
    title: "AH Goudse Belegen 48+",
    priceCents: 837,
    fetchedAt: "2026-09-18T05:00:00.000Z",
    ...partial,
  } as Product;
}

const store = () => new SqliteProductStore(":memory:");

describe("SqliteProductStore", () => {
  test("stores and reads a product back unchanged", async () => {
    const db = store();
    const p = product({
      sourceProductId: "618268",
      brand: "AH",
      salesUnitSize: "ca. 550 g",
      unitPriceCents: 1519,
      unitPriceLabel: "KG",
      priceBeforeBonusCents: 900,
      categoryPath: "Kaas/Goudse",
      taxonomyId: 1192,
      url: "https://www.ah.nl/producten/product/wi618268/x",
    });

    await db.upsertMany([p]);
    expect(await db.get("ah:618268")).toEqual(p);
    await db.close();
  });

  test("optional fields come back absent, not null", async () => {
    // A Product read out of the database must be shaped like one that never
    // went in; a stray `brand: null` breaks every `if (p.brand)` downstream.
    const db = store();
    await db.upsertMany([product({ sourceProductId: "1" })]);

    const back = (await db.get("ah:1"))!;
    expect("brand" in back).toBe(false);
    expect("unitPriceCents" in back).toBe(false);
    await db.close();
  });

  test("a second pass updates rather than duplicates", async () => {
    const db = store();
    await db.upsertMany([product({ sourceProductId: "1", priceCents: 837 })]);
    await db.upsertMany([
      product({ sourceProductId: "1", priceCents: 799, fetchedAt: "2026-09-19T05:00:00.000Z" }),
    ]);

    expect(await db.count("ah")).toBe(1);
    expect((await db.get("ah:1"))!.priceCents).toBe(799);
    await db.close();
  });

  test("finds a product by the chain's own id", async () => {
    const db = store();
    await db.upsertMany([product({ sourceProductId: "618268" })]);

    expect((await db.bySourceId("ah", "618268"))!.id).toBe("ah:618268");
    expect(await db.bySourceId("ah", "nope")).toBeUndefined();
    await db.close();
  });

  test("searches title and brand", async () => {
    const db = store();
    await db.upsertMany([
      product({ sourceProductId: "1", title: "AH Goudse Belegen" }),
      product({ sourceProductId: "2", title: "Calvé Pindakaas", brand: "Calvé" }),
      product({ sourceProductId: "3", title: "Blue Band" }),
    ]);

    expect((await db.query({ search: "goudse" })).map((p) => p.sourceProductId)).toEqual(["1"]);
    expect((await db.query({ search: "calvé" })).map((p) => p.sourceProductId)).toEqual(["2"]);
    await db.close();
  });

  test("pruneStale drops what the latest pass did not see", async () => {
    const db = store();
    await db.upsertMany([
      product({ sourceProductId: "keeps", fetchedAt: "2026-09-19T05:00:00.000Z" }),
      product({ sourceProductId: "delisted", fetchedAt: "2026-09-18T05:00:00.000Z" }),
    ]);

    const removed = await db.pruneStale("ah", "2026-09-19T00:00:00.000Z");

    expect(removed).toBe(1);
    expect(await db.get("ah:delisted")).toBeUndefined();
    expect(await db.get("ah:keeps")).toBeDefined();
    await db.close();
  });

  test("pruning one chain never touches another", async () => {
    // A failed Jumbo crawl must not empty the AH aisle.
    const db = store();
    await db.upsertMany([
      product({ sourceProductId: "1", fetchedAt: "2026-01-01T00:00:00.000Z" }),
      { ...product({ sourceProductId: "9" }), id: "jumbo:9", source: "jumbo" } as Product,
    ]);

    await db.pruneStale("jumbo", "2026-09-19T00:00:00.000Z");

    expect(await db.get("ah:1")).toBeDefined();
    expect(await db.get("jumbo:9")).toBeUndefined();
    await db.close();
  });

  test("a failed batch leaves the catalogue untouched", async () => {
    const db = store();
    await db.upsertMany([product({ sourceProductId: "1" })]);

    // A null title violates NOT NULL; the whole batch must roll back rather
    // than leave the catalogue half-written.
    const broken = [
      product({ sourceProductId: "2" }),
      { ...product({ sourceProductId: "3" }), title: null } as unknown as Product,
    ];
    await expect(db.upsertMany(broken)).rejects.toThrow();

    expect(await db.count("ah")).toBe(1);
    await db.close();
  });

  test("counts per chain and overall", async () => {
    const db = store();
    await db.upsertMany([
      product({ sourceProductId: "1" }),
      { ...product({ sourceProductId: "9" }), id: "jumbo:9", source: "jumbo" } as Product,
    ]);

    expect(await db.count()).toBe(2);
    expect(await db.count("ah")).toBe(1);
    await db.close();
  });

  test("an empty batch is a no-op", async () => {
    const db = store();
    await db.upsertMany([]);
    expect(await db.count()).toBe(0);
    await db.close();
  });
});
