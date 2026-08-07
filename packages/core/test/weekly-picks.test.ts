import { describe, expect, test } from "vitest";
import { effectiveDiscountPercent, isPostableTitle, weeklyPicks } from "../src/weekly-picks";
import type { Offer } from "../src/offer";
import type { DiscountMechanism } from "../src/mechanism";
import type { SupermarketSlug } from "../src/supermarket";

const NOW = "2026-08-07T09:00:00.000Z";

function offer(overrides: Partial<Offer> & { id: string }): Offer {
  return {
    source: "ah" as SupermarketSlug,
    sourceOfferId: overrides.id,
    title: "Een echt product",
    pricing: {
      currentPriceCents: 200,
      originalPriceCents: 400,
      savingsAbsoluteCents: 200,
      savingsPercent: 50,
    },
    mechanism: { type: "price_drop" } as DiscountMechanism,
    validFrom: "2026-08-01",
    validUntil: "2026-08-20",
    flags: {},
    fetchedAt: NOW,
    ...overrides,
  } as Offer;
}

/** No normalised saving, so the mechanism has to supply the percentage. */
const NO_SAVING = {
  currentPriceCents: null,
  originalPriceCents: null,
  savingsAbsoluteCents: null,
  savingsPercent: null,
};

describe("effectiveDiscountPercent", () => {
  test("converts 1+1 gratis to 50% per unit", () => {
    const o = offer({ id: "1", pricing: NO_SAVING, mechanism: { type: "buy_x_get_y_free", buyQuantity: 1, freeQuantity: 1 } });
    expect(effectiveDiscountPercent(o)).toBe(50);
  });

  test("converts 2+1 gratis to 33% per unit", () => {
    const o = offer({ id: "2", pricing: NO_SAVING, mechanism: { type: "buy_x_get_y_free", buyQuantity: 2, freeQuantity: 1 } });
    expect(effectiveDiscountPercent(o)).toBe(33);
  });

  test("spreads 'tweede halve prijs' across both items", () => {
    const o = offer({ id: "3", pricing: NO_SAVING, mechanism: { type: "nth_discounted", nth: 2, percent: 50 } });
    expect(effectiveDiscountPercent(o)).toBe(25);
  });

  /*
   * Regression: "6 VOOR 29.94" ships pricing for the whole six-pack (2994 now,
   * 3990 normally, savingsPercent 25). Deriving a percentage from buyQuantity
   * on top of that reported 87% for a 25% deal — wrong numbers in published
   * copy, which is the one thing this generator must never do.
   */
  test("uses the normalised saving for a multi-buy instead of re-deriving it", () => {
    const o = offer({
      id: "4",
      title: "Monte Tessa Pinot Grigio",
      mechanism: { type: "multi_buy", buyQuantity: 6, totalPriceCents: 2994 },
      pricing: { currentPriceCents: 2994, originalPriceCents: 3990, savingsAbsoluteCents: 996, savingsPercent: 25 },
    });
    expect(effectiveDiscountPercent(o)).toBe(25);
  });

  test("refuses to guess a multi-buy discount when no saving was normalised", () => {
    const o = offer({
      id: "5",
      mechanism: { type: "multi_buy", buyQuantity: 2, totalPriceCents: 300 },
      pricing: { currentPriceCents: null, originalPriceCents: null, savingsAbsoluteCents: null, savingsPercent: null },
    });
    expect(effectiveDiscountPercent(o)).toBeNull();
  });

  test("prefers the normalised saving over the mechanism everywhere", () => {
    // A 1+1 that the chain itself priced at 40% off is a 40% deal, not 50%.
    const o = offer({
      id: "6b",
      mechanism: { type: "buy_x_get_y_free", buyQuantity: 1, freeQuantity: 1 },
      pricing: { currentPriceCents: 300, originalPriceCents: 500, savingsAbsoluteCents: 200, savingsPercent: 40 },
    });
    expect(effectiveDiscountPercent(o)).toBe(40);
  });

  test("has no comparable saving for cashback or free delivery", () => {
    expect(effectiveDiscountPercent(offer({ id: "6", mechanism: { type: "cashback", amountCents: 100 } }))).toBeNull();
    expect(
      effectiveDiscountPercent(offer({ id: "7", mechanism: { type: "free_delivery", minSpendCents: 1250 } })),
    ).toBeNull();
  });
});

describe("isPostableTitle", () => {
  test.each(["OP=OP", "BBQ", "Zomerdeals", "Festivalseizoen", "Thomy: gratis bezorging bij 3 stuks"])(
    "rejects the filler title %s",
    (title) => {
      expect(isPostableTitle(title)).toBe(false);
    },
  );

  test.each(["Pitloze rode druiven", "Alle Magnum ijs", "Hollandse bloemkool"])(
    "accepts the real product %s",
    (title) => {
      expect(isPostableTitle(title)).toBe(true);
    },
  );
});

describe("weeklyPicks", () => {
  test("orders by discount, sharpest first", () => {
    const picks = weeklyPicks(
      [
        offer({ id: "a", source: "ah", pricing: { currentPriceCents: 90, originalPriceCents: 100, savingsAbsoluteCents: 10, savingsPercent: 10 } }),
        offer({ id: "b", source: "jumbo", pricing: { currentPriceCents: 40, originalPriceCents: 100, savingsAbsoluteCents: 60, savingsPercent: 60 } }),
      ],
      { nowIso: NOW },
    );
    expect(picks.map((p) => p.offer.id)).toEqual(["b", "a"]);
  });

  test("caps how many picks one chain can take", () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      offer({ id: `ah-${i}`, source: "ah", pricing: { currentPriceCents: 10, originalPriceCents: 100, savingsAbsoluteCents: 90, savingsPercent: 90 - i } }),
    );
    const other = offer({ id: "lidl-1", source: "lidl", pricing: { currentPriceCents: 90, originalPriceCents: 100, savingsAbsoluteCents: 10, savingsPercent: 10 } });

    const picks = weeklyPicks([...many, other], { nowIso: NOW });

    expect(picks.filter((p) => p.offer.source === "ah")).toHaveLength(2);
    // The weaker Lidl deal still makes it, because variety beats raw percentage.
    expect(picks.some((p) => p.offer.source === "lidl")).toBe(true);
  });

  test("drops deals that expire before readers can act", () => {
    const expiringToday = offer({ id: "soon", validUntil: "2026-08-07" });
    const plentyLeft = offer({ id: "later", validUntil: "2026-08-20" });

    const picks = weeklyPicks([expiringToday, plentyLeft], { nowIso: NOW });

    expect(picks.map((p) => p.offer.id)).toEqual(["later"]);
  });

  test("keeps offers that carry no end date at all", () => {
    const picks = weeklyPicks([offer({ id: "open", validUntil: "" })], { nowIso: NOW });
    expect(picks).toHaveLength(1);
  });

  test("excludes filler titles and uncomparable mechanisms", () => {
    const picks = weeklyPicks(
      [
        offer({ id: "filler", title: "OP=OP" }),
        offer({ id: "delivery", mechanism: { type: "free_delivery", minSpendCents: 1250 } }),
        offer({ id: "good", title: "Pitloze rode druiven" }),
      ],
      { nowIso: NOW },
    );
    expect(picks.map((p) => p.offer.id)).toEqual(["good"]);
  });

  test("is deterministic for equal discounts", () => {
    const input = [
      offer({ id: "z", source: "lidl" }),
      offer({ id: "a", source: "plus" }),
    ];
    const first = weeklyPicks(input, { nowIso: NOW }).map((p) => p.offer.id);
    const second = weeklyPicks([...input].reverse(), { nowIso: NOW }).map((p) => p.offer.id);
    expect(first).toEqual(second);
  });

  test("honours the limit", () => {
    const offers = Array.from({ length: 20 }, (_, i) =>
      offer({ id: `o-${i}`, source: (["ah", "jumbo", "lidl", "aldi", "plus"] as SupermarketSlug[])[i % 5] }),
    );
    expect(weeklyPicks(offers, { nowIso: NOW, limit: 6 })).toHaveLength(6);
  });
});
