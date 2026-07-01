import { describe, expect, test } from "vitest";
import type { Offer } from "@superscout/core";
import { JumboAdapter, type JumboFetcher } from "../src/adapters/jumbo/jumbo.adapter";
import { normalizeJumboPromotion } from "../src/adapters/jumbo/jumbo.normalize";
import { parseJumboMechanism } from "../src/adapters/jumbo/jumbo.mechanism";
import type { JumboNuTabResponse, JumboRawPromotion } from "../src/adapters/jumbo/jumbo.raw";
import fixture from "./fixtures/jumbo-nutab.json" with { type: "json" };

const RESPONSE = fixture as JumboNuTabResponse;
const FETCHED_AT = "2026-07-01T12:00:00.000Z";

const sections = RESPONSE.data.activeTab.runtimes.flatMap((r) => r.sections);
const directPromos: JumboRawPromotion[] = sections.flatMap((s) => s.promotions);
const categoryPromos = sections.flatMap((s) =>
  (s.categories ?? []).flatMap((c) => c.promotions.map((promo) => ({ promo, category: c.title }))),
);
const uniqueIds = new Set([...directPromos, ...categoryPromos.map((x) => x.promo)].map((p) => p.id));

describe("normalizeJumboPromotion", () => {
  test("maps the core fields of a promotion (pricing null — nuTab has no price)", () => {
    const raw = directPromos[0]!;
    const offer: Offer = normalizeJumboPromotion(raw, FETCHED_AT);

    expect(offer.id).toBe(`jumbo:${raw.id}`);
    expect(offer.source).toBe("jumbo");
    expect(offer.title).toBe(raw.title.trim());
    expect(offer.validFrom).toBe(raw.start.iso);
    expect(offer.validUntil).toBe(raw.end.iso);
    expect(offer.fetchedAt).toBe(FETCHED_AT);
    expect(offer.pricing).toEqual({
      currentPriceCents: null,
      originalPriceCents: null,
      savingsAbsoluteCents: null,
      savingsPercent: null,
    });
  });

  test("makes the offer url absolute", () => {
    const raw = directPromos[0]!;
    const offer = normalizeJumboPromotion(raw, FETCHED_AT);
    if (raw.url) expect(offer.url).toBe(`https://www.jumbo.com${raw.url}`);
  });

  test("delegates the mechanism to parseJumboMechanism", () => {
    const raw = directPromos.find((p) => p.tags[0]) ?? directPromos[0]!;
    const label = raw.tags[0]?.text.trim();
    const offer = normalizeJumboPromotion(raw, FETCHED_AT);
    expect(offer.mechanism).toEqual(label ? parseJumboMechanism(label) : { type: "unknown" });
  });

  test("uses the aisle category as the offer's category", () => {
    const { promo, category } = categoryPromos[0]!;
    const offer = normalizeJumboPromotion(promo, FETCHED_AT, category);
    expect(offer.sourceCategoryRaw).toBe(category);
  });
});

describe("JumboAdapter", () => {
  test("fetches promotions from both sections and aisle categories, deduped", async () => {
    const fetcher: JumboFetcher = async () => RESPONSE;
    const adapter = new JumboAdapter(fetcher, () => FETCHED_AT);

    const offers = await adapter.fetchOffers();

    // Bug fix: previously only section.promotions were read (missing the bulk
    // in categories). Now we get every unique promotion.
    expect(offers).toHaveLength(uniqueIds.size);
    expect(uniqueIds.size).toBeGreaterThan(directPromos.length);
    expect(offers.every((o) => o.source === "jumbo")).toBe(true);
    expect(offers.some((o) => o.sourceCategoryRaw)).toBe(true);
  });
});
