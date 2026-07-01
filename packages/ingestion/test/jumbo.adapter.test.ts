import { describe, expect, test } from "vitest";
import type { Offer } from "@superscout/core";
import { JumboAdapter, type JumboFetcher } from "../src/adapters/jumbo/jumbo.adapter";
import { normalizeJumboPromotion } from "../src/adapters/jumbo/jumbo.normalize";
import { parseJumboMechanism } from "../src/adapters/jumbo/jumbo.mechanism";
import type { JumboNuTabResponse, JumboRawPromotion } from "../src/adapters/jumbo/jumbo.raw";
import fixture from "./fixtures/jumbo-nutab.json" with { type: "json" };

const RESPONSE = fixture as JumboNuTabResponse;
const FETCHED_AT = "2026-07-01T12:00:00.000Z";

const rawPromotions: JumboRawPromotion[] = RESPONSE.data.activeTab.runtimes.flatMap((r) =>
  r.sections.flatMap((s) => s.promotions),
);

function rawById(id: string): JumboRawPromotion {
  const p = rawPromotions.find((x) => x.id === id);
  if (!p) throw new Error(`fixture is missing promotion ${id}`);
  return p;
}

describe("normalizeJumboPromotion", () => {
  test("normalizes the core fields of a promotion", () => {
    const raw = rawById("3018049"); // "Alle Valess vleesvervangers", tag "2 voor 4,99"
    const offer: Offer = normalizeJumboPromotion(raw, FETCHED_AT);

    expect(offer.id).toBe("jumbo:3018049");
    expect(offer.source).toBe("jumbo");
    expect(offer.title).toBe(raw.title);
    expect(offer.rawLabel).toBe("2 voor 4,99");
    expect(offer.validFrom).toBe(raw.start.iso);
    expect(offer.validUntil).toBe(raw.end.iso);
    expect(offer.fetchedAt).toBe(FETCHED_AT);
  });

  test("leaves pricing null (nuTab has no old/new price)", () => {
    const offer = normalizeJumboPromotion(rawById("3018049"), FETCHED_AT);
    expect(offer.pricing).toEqual({
      currentPriceCents: null,
      originalPriceCents: null,
      savingsAbsoluteCents: null,
      savingsPercent: null,
    });
  });

  test("makes the offer url absolute", () => {
    const raw = rawById("3018049");
    const offer = normalizeJumboPromotion(raw, FETCHED_AT);
    if (raw.url) {
      expect(offer.url).toBe(`https://www.jumbo.com${raw.url}`);
    }
  });

  test("delegates the mechanism to parseJumboMechanism", () => {
    // Passes whether or not the parser is implemented yet — proves delegation,
    // not the parser's correctness (that's jumbo.mechanism.test.ts).
    const raw = rawById("3018563"); // tag "25% korting"
    const offer = normalizeJumboPromotion(raw, FETCHED_AT);
    expect(offer.mechanism).toEqual(parseJumboMechanism("25% korting"));
  });
});

describe("JumboAdapter", () => {
  test("fetches and normalizes every promotion, ids unique", async () => {
    const fetcher: JumboFetcher = async () => RESPONSE;
    const adapter = new JumboAdapter(fetcher, () => FETCHED_AT);

    const offers = await adapter.fetchOffers();

    expect(offers).toHaveLength(rawPromotions.length);
    expect(offers.every((o) => o.source === "jumbo")).toBe(true);
    expect(offers.every((o) => o.fetchedAt === FETCHED_AT)).toBe(true);
    expect(new Set(offers.map((o) => o.id)).size).toBe(offers.length);
  });
});
