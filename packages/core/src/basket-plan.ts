import type { Offer } from "./offer";
import type { SupermarketSlug } from "./supermarket";

/**
 * Turning a basket into a shopping decision.
 *
 * Grouping a basket by chain is easy and not very useful: nobody drives to
 * five supermarkets. The question a shopper actually has is "how much of my
 * saving do I keep if I only visit two?" — so this computes, for every number
 * of stops, which combination of chains captures the most discount.
 */

export interface BasketStore {
  source: SupermarketSlug;
  offers: Offer[];
  /** What the items from this chain cost at their offer price. */
  subtotalCents: number;
  /** What they save versus the chain's own normal price. */
  savingsCents: number;
}

export interface BasketTrip {
  /** Number of shops visited. */
  stops: number;
  sources: SupermarketSlug[];
  savingsCents: number;
  /** Share of the basket's total saving this trip keeps, 0–100. */
  savingsShare: number;
  itemsCovered: number;
}

export interface BasketPlan {
  totalCents: number;
  savingsCents: number;
  itemCount: number;
  /** Chains in the basket, biggest saving first. */
  stores: BasketStore[];
  /** Best combination per number of stops, shortest trip first. */
  trips: BasketTrip[];
}

function groupByStore(offers: Offer[]): BasketStore[] {
  const groups = new Map<SupermarketSlug, Offer[]>();
  for (const offer of offers) {
    const existing = groups.get(offer.source);
    if (existing) existing.push(offer);
    else groups.set(offer.source, [offer]);
  }

  return [...groups.entries()]
    .map(([source, group]) => ({
      source,
      offers: group,
      subtotalCents: group.reduce((sum, o) => sum + (o.pricing.currentPriceCents ?? 0), 0),
      savingsCents: group.reduce((sum, o) => sum + (o.pricing.savingsAbsoluteCents ?? 0), 0),
    }))
    .sort((a, b) => b.savingsCents - a.savingsCents || b.offers.length - a.offers.length);
}

/**
 * Best combination of chains for each number of stops.
 *
 * Taking the top `k` savers is provably optimal here, so no subset search is
 * needed: every item belongs to exactly one chain, so a chain's saving is
 * independent of which other chains you visit. Maximising an additive,
 * independent value over subsets of size k *is* "take the k largest". An
 * exhaustive search over 2^n subsets would return the same answer slower.
 *
 * `stores` arrives sorted by saving, then by item count — which also settles
 * ties in favour of the trip that crosses more off your list.
 */
function bestTrips(stores: BasketStore[]): BasketTrip[] {
  const totalSavings = stores.reduce((sum, s) => sum + s.savingsCents, 0);

  const trips: BasketTrip[] = [];
  let savingsCents = 0;
  let itemsCovered = 0;
  const sources: SupermarketSlug[] = [];

  for (const store of stores) {
    savingsCents += store.savingsCents;
    itemsCovered += store.offers.length;
    sources.push(store.source);

    trips.push({
      stops: sources.length,
      sources: [...sources],
      savingsCents,
      // A basket with nothing to save keeps 0%, not a meaningless 100%.
      savingsShare: totalSavings > 0 ? Math.round((savingsCents / totalSavings) * 100) : 0,
      itemsCovered,
    });
  }

  return trips;
}

/** Build the full plan for a basket. Pure: same input, same output. */
export function planBasket(offers: Offer[]): BasketPlan {
  const stores = groupByStore(offers);

  return {
    totalCents: stores.reduce((sum, s) => sum + s.subtotalCents, 0),
    savingsCents: stores.reduce((sum, s) => sum + s.savingsCents, 0),
    itemCount: offers.length,
    stores,
    trips: bestTrips(stores),
  };
}

/**
 * The trip worth suggesting: the fewest stops that still keep most of the
 * saving. Returns null when the basket is already a single shop, or when no
 * shorter trip is a meaningful improvement over simply visiting everything.
 */
export function recommendedTrip(plan: BasketPlan, threshold = 80): BasketTrip | null {
  if (plan.stores.length <= 1) return null;
  const worthwhile = plan.trips.find(
    (trip) => trip.stops < plan.stores.length && trip.savingsShare >= threshold,
  );
  return worthwhile ?? null;
}
