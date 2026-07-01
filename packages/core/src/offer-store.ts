import type { Offer } from "./offer";
import type { SupermarketSlug } from "./supermarket";
import type { MechanismType } from "./mechanism";

/** A narrow query surface; grows as the frontend needs it. */
export interface OfferQuery {
  source?: SupermarketSlug;
  mechanismType?: MechanismType;
}

/**
 * Where normalized Offers land. Async so a database-backed implementation
 * drops in later without changing callers. Keyed by `Offer.id`; upserts replace.
 */
export interface OfferStore {
  upsertMany(offers: Offer[]): Promise<void>;
  all(): Promise<Offer[]>;
  get(id: string): Promise<Offer | undefined>;
  query(q: OfferQuery): Promise<Offer[]>;
  size(): Promise<number>;
  clear(): Promise<void>;
}

/** In-memory OfferStore for tests and local dev. */
export class InMemoryOfferStore implements OfferStore {
  private readonly offers = new Map<string, Offer>();

  async upsertMany(offers: Offer[]): Promise<void> {
    for (const offer of offers) this.offers.set(offer.id, offer);
  }

  async all(): Promise<Offer[]> {
    return [...this.offers.values()];
  }

  async get(id: string): Promise<Offer | undefined> {
    return this.offers.get(id);
  }

  async query(q: OfferQuery): Promise<Offer[]> {
    return [...this.offers.values()].filter(
      (o) =>
        (q.source === undefined || o.source === q.source) &&
        (q.mechanismType === undefined || o.mechanism.type === q.mechanismType),
    );
  }

  async size(): Promise<number> {
    return this.offers.size;
  }

  async clear(): Promise<void> {
    this.offers.clear();
  }
}
