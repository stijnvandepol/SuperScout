import { describe, expect, test } from "vitest";
import { normalizeLidlOffer } from "../src/adapters/lidl/lidl.normalize";
import type { LidlRawOffer } from "../src/adapters/lidl/lidl.raw";

const FETCHED = "2026-07-02T09:00:00.000Z";

const base: LidlRawOffer = {
  id: "p10029633",
  title: "NESCAFÉ Dolce Gusto",
  description: "In verschillende varianten",
  currentPrice: "6.49",
  oldPrice: "9.49",
  discount: "-31%",
  pack: "15-30 stuks",
  badge: "Alleen in de winkel 29/06 - 05/07",
  url: "/p/nescafe-dolce-gusto/p10029633",
  image: "https://imgproxy-retcat.assets.schwarz/abc/sm",
};

describe("normalizeLidlOffer", () => {
  test("maps a full offer with old price to a price_drop and parses validity", () => {
    const o = normalizeLidlOffer(base, FETCHED);
    expect(o.id).toBe("lidl:p10029633");
    expect(o.source).toBe("lidl");
    expect(o.title).toBe("NESCAFÉ Dolce Gusto");
    expect(o.pricing.currentPriceCents).toBe(649);
    expect(o.pricing.originalPriceCents).toBe(949);
    expect(o.pricing.savingsAbsoluteCents).toBe(300);
    expect(o.mechanism).toEqual({ type: "price_drop" });
    expect(o.validFrom).toBe("2026-06-29");
    expect(o.validUntil).toBe("2026-07-05");
    expect(o.url).toBe("https://www.lidl.nl/p/nescafe-dolce-gusto/p10029633");
  });

  test("parses comma-decimal prices", () => {
    const o = normalizeLidlOffer({ ...base, currentPrice: "1,49", oldPrice: undefined }, FETCHED);
    expect(o.pricing.currentPriceCents).toBe(149);
    expect(o.pricing.originalPriceCents).toBeNull();
  });

  test("uses percentage_off when only a discount badge is present", () => {
    const o = normalizeLidlOffer({ ...base, oldPrice: undefined, discount: "-31%" }, FETCHED);
    expect(o.mechanism).toEqual({ type: "percentage_off", percent: 31 });
  });

  test("leaves validity empty when the badge has no date range", () => {
    const o = normalizeLidlOffer({ ...base, badge: "Nieuw" }, FETCHED);
    expect(o.validFrom).toBe("");
    expect(o.validUntil).toBe("");
  });

  test("handles a year rollover (Dec -> Jan)", () => {
    const o = normalizeLidlOffer({ ...base, badge: "28/12 - 03/01" }, "2026-12-29T09:00:00.000Z");
    expect(o.validFrom).toBe("2026-12-28");
    expect(o.validUntil).toBe("2027-01-03");
  });
});
