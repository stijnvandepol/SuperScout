import { describe, expect, test } from "vitest";
import { planBasket, recommendedTrip } from "../src/basket-plan";
import type { Offer } from "../src/offer";
import type { SupermarketSlug } from "../src/supermarket";

function item(source: SupermarketSlug, priceCents: number, savingsCents: number, id = `${source}-${priceCents}-${savingsCents}`): Offer {
  return {
    id,
    source,
    sourceOfferId: id,
    title: `Product ${id}`,
    pricing: {
      currentPriceCents: priceCents,
      originalPriceCents: priceCents + savingsCents,
      savingsAbsoluteCents: savingsCents,
      savingsPercent: Math.round((savingsCents / (priceCents + savingsCents)) * 100),
    },
    mechanism: { type: "price_drop" },
    validFrom: "2026-08-01",
    validUntil: "2026-08-20",
    flags: {},
    fetchedAt: "2026-08-07T09:00:00.000Z",
  } as Offer;
}

describe("planBasket", () => {
  test("totals price and saving across the whole basket", () => {
    const plan = planBasket([item("ah", 200, 100), item("jumbo", 300, 50)]);
    expect(plan.totalCents).toBe(500);
    expect(plan.savingsCents).toBe(150);
    expect(plan.itemCount).toBe(2);
  });

  test("groups by chain, biggest saver first", () => {
    const plan = planBasket([item("ah", 100, 10), item("lidl", 100, 90), item("ah", 100, 10)]);
    expect(plan.stores.map((s) => s.source)).toEqual(["lidl", "ah"]);
    expect(plan.stores[1]?.offers).toHaveLength(2);
    expect(plan.stores[1]?.savingsCents).toBe(20);
  });

  test("treats an item without a recorded saving as zero, not as missing", () => {
    const noSaving = { ...item("ah", 200, 0), pricing: { currentPriceCents: 200, originalPriceCents: null, savingsAbsoluteCents: null, savingsPercent: null } } as Offer;
    const plan = planBasket([noSaving]);
    expect(plan.totalCents).toBe(200);
    expect(plan.savingsCents).toBe(0);
  });

  /*
   * Savings are additive and each item belongs to exactly one chain, so the
   * best k stops are simply the k biggest savers. This pins that property —
   * if the basket ever gains cross-chain interactions (a per-shop minimum, a
   * delivery fee), the top-k shortcut stops being correct and this fails.
   */
  test("the best k stops are the k biggest savers", () => {
    const plan = planBasket([
      item("ah", 100, 100),
      item("jumbo", 100, 80),
      item("lidl", 100, 60),
    ]);

    const twoStops = plan.trips.find((t) => t.stops === 2);
    expect(twoStops?.savingsCents).toBe(180);
    expect(twoStops?.sources).toEqual(["ah", "jumbo"]);
  });

  test("a full trip always captures everything", () => {
    const plan = planBasket([item("ah", 100, 40), item("jumbo", 100, 60)]);
    const full = plan.trips.find((t) => t.stops === 2);
    expect(full?.savingsShare).toBe(100);
    expect(full?.itemsCovered).toBe(2);
  });

  test("breaks ties on how much of the list gets done", () => {
    // Both single stops save 50; ah covers two items, so it wins.
    const plan = planBasket([item("ah", 100, 25, "a1"), item("ah", 100, 25, "a2"), item("lidl", 100, 50, "l1")]);
    const oneStop = plan.trips.find((t) => t.stops === 1);
    expect(oneStop?.sources).toEqual(["ah"]);
    expect(oneStop?.itemsCovered).toBe(2);
  });

  test("handles an empty basket without dividing by zero", () => {
    const plan = planBasket([]);
    expect(plan.totalCents).toBe(0);
    expect(plan.savingsCents).toBe(0);
    expect(plan.stores).toEqual([]);
    expect(plan.trips).toEqual([]);
  });
});

describe("recommendedTrip", () => {
  test("suggests dropping a chain that barely contributes", () => {
    // Lidl adds 5 cents of the 105 total — not worth a second stop.
    const plan = planBasket([item("ah", 100, 100), item("lidl", 100, 5)]);
    const trip = recommendedTrip(plan);
    expect(trip?.stops).toBe(1);
    expect(trip?.sources).toEqual(["ah"]);
  });

  test("stays quiet when every stop pulls its weight", () => {
    const plan = planBasket([item("ah", 100, 50), item("lidl", 100, 50)]);
    expect(recommendedTrip(plan)).toBeNull();
  });

  test("stays quiet for a single-chain basket", () => {
    expect(recommendedTrip(planBasket([item("ah", 100, 50)]))).toBeNull();
  });

  test("a basket with no savings at all does not suggest a detour", () => {
    const plan = planBasket([item("ah", 100, 0), item("lidl", 100, 0)]);
    // Zero savings everywhere means every subset captures "100%" of nothing;
    // the suggestion must not claim a saving that does not exist.
    const trip = recommendedTrip(plan);
    expect(trip === null || trip.savingsCents === 0).toBe(true);
  });
});
