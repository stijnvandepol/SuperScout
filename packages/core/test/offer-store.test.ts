import { describe, expect, test } from "vitest";
import { InMemoryOfferStore } from "../src/offer-store";
import type { Offer } from "../src/offer";
import type { DiscountMechanism } from "../src/mechanism";
import type { SupermarketSlug } from "../src/supermarket";

function offer(
  id: string,
  source: SupermarketSlug,
  mechanism: DiscountMechanism,
  title = id,
): Offer {
  return {
    id,
    source,
    sourceOfferId: id.split(":")[1] ?? id,
    title,
    pricing: {
      currentPriceCents: null,
      originalPriceCents: null,
      savingsAbsoluteCents: null,
      savingsPercent: null,
    },
    mechanism,
    validFrom: "2026-07-01",
    validUntil: "2026-07-07",
    flags: {},
    fetchedAt: "2026-07-01T12:00:00.000Z",
  };
}

describe("InMemoryOfferStore", () => {
  test("stores and returns offers", async () => {
    const store = new InMemoryOfferStore();
    await store.upsertMany([
      offer("dirk:1", "dirk", { type: "price_drop" }),
      offer("jumbo:2", "jumbo", { type: "percentage_off", percent: 25 }),
    ]);

    expect(await store.size()).toBe(2);
    expect((await store.all()).map((o) => o.id).sort()).toEqual(["dirk:1", "jumbo:2"]);
    expect(await store.get("dirk:1")).toMatchObject({ id: "dirk:1" });
    expect(await store.get("missing")).toBeUndefined();
  });

  test("upsert replaces an existing offer by id (idempotent re-ingest)", async () => {
    const store = new InMemoryOfferStore();
    await store.upsertMany([offer("dirk:1", "dirk", { type: "price_drop" }, "old")]);
    await store.upsertMany([offer("dirk:1", "dirk", { type: "price_drop" }, "new")]);

    expect(await store.size()).toBe(1);
    expect((await store.get("dirk:1"))?.title).toBe("new");
  });

  test("queries by source", async () => {
    const store = new InMemoryOfferStore();
    await store.upsertMany([
      offer("dirk:1", "dirk", { type: "price_drop" }),
      offer("jumbo:2", "jumbo", { type: "price_drop" }),
    ]);
    const dirk = await store.query({ source: "dirk" });
    expect(dirk.map((o) => o.id)).toEqual(["dirk:1"]);
  });

  test("queries by mechanism type (the payoff of the taxonomy)", async () => {
    const store = new InMemoryOfferStore();
    await store.upsertMany([
      offer("dirk:1", "dirk", { type: "price_drop" }),
      offer("ah:2", "ah", { type: "buy_x_get_y_free", buyQuantity: 1, freeQuantity: 1 }),
      offer("plus:3", "plus", { type: "buy_x_get_y_free", buyQuantity: 2, freeQuantity: 1 }),
    ]);
    const bogo = await store.query({ mechanismType: "buy_x_get_y_free" });
    expect(bogo.map((o) => o.id).sort()).toEqual(["ah:2", "plus:3"]);
  });

  test("clears", async () => {
    const store = new InMemoryOfferStore();
    await store.upsertMany([offer("dirk:1", "dirk", { type: "price_drop" })]);
    await store.clear();
    expect(await store.size()).toBe(0);
  });
});
