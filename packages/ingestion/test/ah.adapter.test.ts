import { describe, expect, test } from "vitest";
import type { Offer } from "@superscout/core";
import { AhAdapter, type AhFetcher } from "../src/adapters/ah/ah.adapter";
import { normalizeAhPromotion } from "../src/adapters/ah/ah.normalize";
import type { AhBonusPromotionsResponse, AhRawPromotion } from "../src/adapters/ah/ah.raw";
import fixture from "./fixtures/ah-bonus-promotions.json" with { type: "json" };

const RESPONSE = fixture as AhBonusPromotionsResponse;
const FETCHED_AT = "2026-07-01T12:00:00.000Z";

function rawById(id: string): AhRawPromotion {
  const p = RESPONSE.data.bonusPromotions.find((x) => x.id === id);
  if (!p) throw new Error(`fixture is missing promotion ${id}`);
  return p;
}

describe("normalizeAhPromotion", () => {
  test('maps a structured "2e gratis" promotion', () => {
    const raw = rawById("799323"); // AH Gerookte zalm, ONE_FREE count 2
    const offer: Offer = normalizeAhPromotion(raw, FETCHED_AT);

    expect(offer.id).toBe("ah:799323");
    expect(offer.source).toBe("ah");
    expect(offer.title).toBe("AH Gerookte zalm 100 gram");
    expect(offer.mechanism).toEqual({ type: "buy_x_get_y_free", buyQuantity: 1, freeQuantity: 1 });
    expect(offer.rawLabel).toBe("2e gratis");
    expect(offer.sourceCategoryRaw).toBe("Vis");
    expect(offer.url).toBe("https://www.ah.nl/bonus/groep/799323");
    expect(offer.validFrom).toBe("2026-06-29");
    expect(offer.validUntil).toBe("2026-07-05");
    expect(offer.fetchedAt).toBe(FETCHED_AT);
  });

  test("picks the largest image rendition", () => {
    const raw = rawById("799323");
    const expected = (raw.images ?? []).reduce((best, img) =>
      (img.width ?? 0) > (best.width ?? 0) ? img : best,
    );
    const offer = normalizeAhPromotion(raw, FETCHED_AT);
    expect(offer.imageUrl).toBe(expected.url);
  });

  test("maps a BONUS promotion to unknown but keeps the was-price", () => {
    const raw = rawById("794520"); // BONUS, price.was 2.09
    const offer = normalizeAhPromotion(raw, FETCHED_AT);
    expect(offer.mechanism).toEqual({ type: "unknown" });
    expect(offer.pricing.originalPriceCents).toBe(209);
    expect(offer.pricing.currentPriceCents).toBeNull();
    expect(offer.pricing.savingsAbsoluteCents).toBeNull();
  });
});

describe("AhAdapter", () => {
  test("fetches and normalizes every promotion, ids unique", async () => {
    const fetcher: AhFetcher = async () => RESPONSE;
    const adapter = new AhAdapter(fetcher, () => FETCHED_AT);

    const offers = await adapter.fetchOffers();

    expect(offers).toHaveLength(RESPONSE.data.bonusPromotions.length);
    expect(offers.every((o) => o.source === "ah")).toBe(true);
    expect(offers.every((o) => o.fetchedAt === FETCHED_AT)).toBe(true);
    expect(new Set(offers.map((o) => o.id)).size).toBe(offers.length);
  });
});
