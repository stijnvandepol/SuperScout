import { describe, expect, test } from "vitest";
import {
  buildSeries,
  newObservations,
  observationsFrom,
  parseObservations,
  priceInsight,
  priceKey,
  serialiseObservations,
  type PriceObservation,
} from "../src/price-history";
import type { Offer } from "../src/offer";
import type { SupermarketSlug } from "../src/supermarket";

function offer(title: string, priceCents: number | null, source: SupermarketSlug = "ah"): Offer {
  return {
    id: `${source}:${title}`,
    source,
    sourceOfferId: title,
    title,
    pricing: {
      currentPriceCents: priceCents,
      originalPriceCents: null,
      savingsAbsoluteCents: null,
      savingsPercent: null,
    },
    mechanism: { type: "price_drop" },
    validFrom: "2026-08-01",
    validUntil: "2026-08-20",
    flags: {},
    fetchedAt: "2026-08-07T09:00:00.000Z",
  } as Offer;
}

function obs(key: string, date: string, priceCents: number): PriceObservation {
  return { key, date, priceCents };
}

describe("priceKey", () => {
  test("survives the wording chains change between weeks", () => {
    // "Alle Magnum ijs" one week, "Magnum ijs" the next, must be one product.
    expect(priceKey(offer("Alle Magnum ijs", 299))).toBe(priceKey(offer("Magnum ijs", 299)));
  });

  test("ignores case, accents and punctuation", () => {
    expect(priceKey(offer("Crème Fraîche 200g", 129))).toBe(priceKey(offer("creme fraiche 200g", 129)));
  });

  test("keeps different chains apart", () => {
    expect(priceKey(offer("Magnum", 299, "ah"))).not.toBe(priceKey(offer("Magnum", 299, "jumbo")));
  });

  test("refuses a title too short to identify anything", () => {
    expect(priceKey(offer("A", 100))).toBeNull();
  });
});

describe("observationsFrom", () => {
  test("records one observation per product per day", () => {
    const result = observationsFrom([offer("Magnum", 299), offer("Druiven", 199)], "2026-08-07T09:00:00Z");
    expect(result).toHaveLength(2);
    expect(result.every((o) => o.date === "2026-08-07")).toBe(true);
  });

  /*
   * ~1% of keys collide within a snapshot (the same name in two pack sizes).
   * Keeping the lowest makes the recorded number "the best advertised price
   * under this name", which is at least a defined quantity.
   */
  test("keeps the lowest price when one name appears twice", () => {
    const result = observationsFrom([offer("Coca-Cola", 250), offer("Coca-Cola", 180)], "2026-08-07");
    expect(result).toHaveLength(1);
    expect(result[0]?.priceCents).toBe(180);
  });

  test("skips offers with no price at all", () => {
    // A "1+1 gratis" with no unit price is not a price point.
    expect(observationsFrom([offer("Iets", null)], "2026-08-07")).toEqual([]);
  });
});

describe("newObservations", () => {
  test("is idempotent — a second run the same day adds nothing", () => {
    const existing = [obs("ah|magnum", "2026-08-07", 299)];
    const incoming = [obs("ah|magnum", "2026-08-07", 299)];
    expect(newObservations(existing, incoming)).toEqual([]);
  });

  test("does not overwrite a day already recorded, even at another price", () => {
    const existing = [obs("ah|magnum", "2026-08-07", 299)];
    const incoming = [obs("ah|magnum", "2026-08-07", 250)];
    expect(newObservations(existing, incoming)).toEqual([]);
  });

  test("accepts the same product on a later day", () => {
    const existing = [obs("ah|magnum", "2026-08-07", 299)];
    const incoming = [obs("ah|magnum", "2026-08-08", 250)];
    expect(newObservations(existing, incoming)).toHaveLength(1);
  });
});

describe("priceInsight", () => {
  const longRun = [
    obs("k", "2026-01-01", 300),
    obs("k", "2026-02-01", 250),
    obs("k", "2026-03-01", 350),
    obs("k", "2026-04-01", 300),
  ];

  test("says nothing when there is barely any history", () => {
    expect(priceInsight([obs("k", "2026-08-07", 299)], 299)).toBeNull();
    expect(priceInsight([obs("k", "2026-08-06", 299), obs("k", "2026-08-07", 250)], 250)).toBeNull();
  });

  test("says nothing when the history is dense but too short a span", () => {
    // Three observations in three days cannot establish a record low.
    const dense = [obs("k", "2026-08-05", 300), obs("k", "2026-08-06", 280), obs("k", "2026-08-07", 250)];
    expect(priceInsight(dense, 250)).toBeNull();
  });

  test("reports a record low", () => {
    const insight = priceInsight(longRun, 240);
    expect(insight?.isLowestEver).toBe(true);
    expect(insight?.lowestCents).toBe(250);
    expect(insight?.promotions).toBe(4);
  });

  /*
   * The worker samples daily, so a single week-long promo lands as seven rows.
   * Reporting that as "7x in de aanbieding" would tell shoppers a product is
   * discounted every week when it ran once.
   */
  test("counts a week of consecutive days as one promotion", () => {
    const oneWeek = Array.from({ length: 7 }, (_, i) =>
      obs("k", `2026-01-0${i + 1}`, 300),
    );
    const secondRun = [obs("k", "2026-03-01", 250), obs("k", "2026-03-02", 250)];

    const insight = priceInsight([...oneWeek, ...secondRun], 250);

    expect(insight?.promotions).toBe(2);
    expect(insight?.daysSeen).toBe(9);
  });

  test("a duplicate row for the same day does not invent a promotion", () => {
    const withDuplicate = [
      obs("k", "2026-01-01", 300),
      obs("k", "2026-01-01", 300),
      obs("k", "2026-03-01", 250),
      obs("k", "2026-05-01", 275),
    ];
    expect(priceInsight(withDuplicate, 250)?.promotions).toBe(3);
  });

  test("does not call a merely-cheap price a record", () => {
    const insight = priceInsight(longRun, 275);
    expect(insight?.isLowestEver).toBe(false);
    expect(insight?.belowAverage).toBe(true);
  });

  test("recognises an above-average price", () => {
    const insight = priceInsight(longRun, 340);
    expect(insight?.belowAverage).toBe(false);
    expect(insight?.averageCents).toBe(300);
  });

  test("says nothing without a current price to compare against", () => {
    expect(priceInsight(longRun, null)).toBeNull();
  });
});

describe("storage round-trip", () => {
  test("serialises and parses back identically", () => {
    const observations = [obs("ah|magnum", "2026-08-07", 299), obs("lidl|druiven", "2026-08-07", 119)];
    expect(parseObservations(serialiseObservations(observations))).toEqual(observations);
  });

  test("survives a truncated final line from an interrupted append", () => {
    const jsonl = `${serialiseObservations([obs("ah|magnum", "2026-08-07", 299)])}\n{"k":"lidl|dru`;
    expect(parseObservations(jsonl)).toEqual([obs("ah|magnum", "2026-08-07", 299)]);
  });

  test("skips malformed rows instead of failing the whole history", () => {
    const jsonl = ['{"k":"a","d":"2026-08-07","p":100}', '{"k":"b","d":"2026-08-07"}', "not json"].join("\n");
    expect(parseObservations(jsonl)).toEqual([obs("a", "2026-08-07", 100)]);
  });

  test("groups a parsed history into per-product series, oldest first", () => {
    const series = buildSeries([obs("a", "2026-03-01", 100), obs("a", "2026-01-01", 200), obs("b", "2026-01-01", 50)]);
    expect(series.get("a")?.map((o) => o.date)).toEqual(["2026-01-01", "2026-03-01"]);
    expect(series.get("b")).toHaveLength(1);
  });
});
