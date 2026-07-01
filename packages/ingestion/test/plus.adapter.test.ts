import { describe, expect, test } from "vitest";
import type { Offer } from "@superscout/core";
import { PlusAdapter, type PlusFetcher } from "../src/adapters/plus/plus.adapter";
import { normalizePlusOffer } from "../src/adapters/plus/plus.normalize";
import type { PlusPromotionListResponse, PlusRawOffer } from "../src/adapters/plus/plus.raw";
import fixture from "./fixtures/plus-promotions.json" with { type: "json" };

const RESPONSE = fixture as PlusPromotionListResponse;
const FETCHED_AT = "2026-07-01T12:00:00.000Z";

interface Flat {
  categoryLabel: string;
  offer: PlusRawOffer;
}
const flat: Flat[] = RESPONSE.data.PromotionOfferList.List.flatMap((g) =>
  g.Category.Offers.List.map((offer) => ({ categoryLabel: g.Category.CategoryLabel, offer })),
);

function byId(id: string): Flat {
  const f = flat.find(({ offer }) => `${offer.PromotionID}-${offer.Offer_Id}` === id);
  if (!f) throw new Error(`fixture is missing offer ${id}`);
  return f;
}

function normById(id: string): Offer {
  const { offer, categoryLabel } = byId(id);
  return normalizePlusOffer(offer, categoryLabel, FETCHED_AT);
}

describe("normalizePlusOffer", () => {
  test('maps a "1+1 GRATIS" offer, original price from PriceOriginal_Lowest', () => {
    const { categoryLabel } = byId("4436-177");
    const offer = normById("4436-177"); // Verse watermeloen..., 1+1 GRATIS, new 3.89 / lowest 7.78

    expect(offer.id).toBe("plus:4436-177");
    expect(offer.source).toBe("plus");
    expect(offer.brand).toBe("PLUS");
    expect(offer.mechanism).toEqual({ type: "buy_x_get_y_free", buyQuantity: 1, freeQuantity: 1 });
    expect(offer.rawLabel).toBe("1+1 GRATIS");
    expect(offer.pricing.currentPriceCents).toBe(389);
    expect(offer.pricing.originalPriceCents).toBe(778);
    expect(offer.pricing.savingsAbsoluteCents).toBe(389);
    expect(offer.pricing.savingsPercent).toBe(50);
    expect(offer.sourceCategoryRaw).toBe(categoryLabel);
    expect(offer.validFrom).toBe("2026-07-01");
    expect(offer.imageUrl?.startsWith("https://images.ctfassets.net")).toBe(true);
    expect(offer.fetchedAt).toBe(FETCHED_AT);
  });

  test("empty label with a real price cut falls back to price_drop", () => {
    const offer = normById("4436-176"); // Frambozen, label "", new 2.99 / origP 4.99
    expect(offer.mechanism).toEqual({ type: "price_drop" });
    expect(offer.pricing.currentPriceCents).toBe(299);
    expect(offer.pricing.originalPriceCents).toBe(499);
    expect(offer.pricing.savingsPercent).toBe(40);
  });

  test("free-delivery offer maps its mechanism and has no product price", () => {
    const offer = normById("4436-145"); // GRATIS BEZORGING BIJ 10.00 EURO, all prices 0
    expect(offer.mechanism).toEqual({ type: "free_delivery", minSpendCents: 1000 });
    expect(offer.pricing.currentPriceCents).toBeNull();
    expect(offer.pricing.originalPriceCents).toBeNull();
  });

  test("flags age restriction from NIX18", () => {
    const base = byId("4436-145").offer;
    const nix: PlusRawOffer = { ...base, Product_IsNIX18: true };
    const offer = normalizePlusOffer(nix, "Wijn, bier, sterke drank", FETCHED_AT);
    expect(offer.flags.isAgeRestricted).toBe(true);
  });
});

describe("PlusAdapter", () => {
  test("fetches and normalizes every category offer, ids unique", async () => {
    const fetcher: PlusFetcher = async () => RESPONSE;
    const adapter = new PlusAdapter(fetcher, () => FETCHED_AT);

    const offers = await adapter.fetchOffers();

    expect(offers).toHaveLength(flat.length);
    expect(offers.every((o) => o.source === "plus")).toBe(true);
    expect(new Set(offers.map((o) => o.id)).size).toBe(offers.length);
  });
});
