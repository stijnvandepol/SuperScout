import { describe, expect, test } from "vitest";
import type { Offer } from "@superscout/core";
import { DirkAdapter, type JsonFetcher } from "../src/adapters/dirk/dirk.adapter";
import { normalizeDirkOffer, DIRK_IMAGE_BASE } from "../src/adapters/dirk/dirk.normalize";
import type { DirkOffersResponse } from "../src/adapters/dirk/dirk.raw";
import fixture from "./fixtures/dirk-offers.json" with { type: "json" };

const RESPONSE = fixture as DirkOffersResponse;
const FETCHED_AT = "2026-07-01T12:00:00.000Z";

function normalizeAll(): Offer[] {
  return RESPONSE.currentOffers.map((raw) => normalizeDirkOffer(raw, FETCHED_AT));
}

function byId(id: string): Offer {
  const offer = normalizeAll().find((o) => o.sourceOfferId === id);
  if (!offer) throw new Error(`fixture is missing offer ${id}`);
  return offer;
}

describe("normalizeDirkOffer", () => {
  test("normalizes a straightforward price-drop offer", () => {
    const offer = byId("137274"); // Bonduelle, €2.79 -> €0.99

    expect(offer.id).toBe("dirk:137274");
    expect(offer.source).toBe("dirk");
    expect(offer.title).toBe("Bonduelle");
    expect(offer.brand).toBe("Bonduelle");
    expect(offer.pricing).toEqual({
      currentPriceCents: 99,
      originalPriceCents: 279,
      savingsAbsoluteCents: 180,
      savingsPercent: 65,
    });
    expect(offer.mechanism).toEqual({ type: "price_drop" });
    expect(offer.rawLabel).toBe("ACTIE_");
    expect(offer.validFrom).toBe("2026-07-01T00:00:00.000Z");
    expect(offer.validUntil).toBe("2026-07-07T23:59:00.000Z");
    expect(offer.fetchedAt).toBe(FETCHED_AT);
  });

  test("builds the image URL with the path percent-encoded (slashes and spaces)", () => {
    const offer = byId("137274");
    expect(offer.imageUrl).toBe(
      DIRK_IMAGE_BASE + "4%2F7%2F2%2F7%2F3%2F1%2FBonduelle%20V2_639178257799454239.png",
    );
  });

  test("leaves savings null when there is no reference price (normalPrice 0)", () => {
    const offer = byId("137396"); // Blauwe bessen, offerPrice 2.99, normalPrice 0
    expect(offer.pricing.currentPriceCents).toBe(299);
    expect(offer.pricing.originalPriceCents).toBeNull();
    expect(offer.pricing.savingsAbsoluteCents).toBeNull();
    expect(offer.pricing.savingsPercent).toBeNull();
    expect(offer.mechanism).toEqual({ type: "price_drop" });
  });

  test("leaves brand undefined when the offer has no concrete product", () => {
    const offer = byId("137395"); // products are all null
    expect(offer.brand).toBeUndefined();
  });
});

describe("DirkAdapter", () => {
  test("fetches, normalizes and de-duplicates across departments", async () => {
    // Department 1 returns the fixture; all other departments return nothing.
    const fetcher: JsonFetcher = async (url) =>
      url.endsWith("/1") ? RESPONSE : { currentOffers: [] };
    const adapter = new DirkAdapter(fetcher, () => FETCHED_AT);

    const offers = await adapter.fetchOffers();

    expect(offers).toHaveLength(RESPONSE.currentOffers.length);
    expect(offers.every((o) => o.fetchedAt === FETCHED_AT)).toBe(true);
    expect(new Set(offers.map((o) => o.id)).size).toBe(offers.length);
  });

  test("de-duplicates an offer that appears in two departments", async () => {
    const fetcher: JsonFetcher = async () => RESPONSE; // every department returns the same offers
    const adapter = new DirkAdapter(fetcher, () => FETCHED_AT);

    const offers = await adapter.fetchOffers();

    expect(offers).toHaveLength(RESPONSE.currentOffers.length);
  });
});
