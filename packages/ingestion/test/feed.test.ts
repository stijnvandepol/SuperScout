import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { feedAdapters, FeedFileAdapter } from "../src/adapters/feed/feed.adapter";
import { parsePromoLabel as parseFeedLabel } from "@superscout/core";
import { normalizeFeed, type FeedFile, type FeedOffer } from "../src/adapters/feed/feed.normalize";

const NOW = "2026-10-05T08:00:00.000Z";

function row(overrides: Partial<FeedOffer> = {}): FeedOffer {
  return {
    id: "123",
    title: "Voorbeeld shampoo 250 ml",
    brand: "Voorbeeld",
    priceCents: 299,
    originalPriceCents: 499,
    validFrom: "2026-10-01",
    validUntil: "2026-10-12",
    url: "https://www.kruidvat.nl/voorbeeld/p/123",
    ...overrides,
  };
}

function file(offers: FeedOffer[], overrides: Partial<FeedFile> = {}): FeedFile {
  return {
    retailer: "kruidvat",
    provenance: "partner-feed",
    licence: "Testlicentie, alleen voor de testsuite",
    updatedAt: "2026-10-04T10:00:00Z",
    offers,
    ...overrides,
  };
}

describe("parseFeedLabel", () => {
  test.each([
    ["1+1 gratis", { type: "buy_x_get_y_free", buyQuantity: 1, freeQuantity: 1 }],
    ["2 + 1 GRATIS", { type: "buy_x_get_y_free", buyQuantity: 2, freeQuantity: 1 }],
    ["2e halve prijs", { type: "nth_discounted", nth: 2, percent: 50 }],
    ["2e gratis", { type: "nth_discounted", nth: 2, percent: 100 }],
    ["3 voor €5", { type: "multi_buy", buyQuantity: 3, totalPriceCents: 500 }],
    ["2 voor 3,99", { type: "multi_buy", buyQuantity: 2, totalPriceCents: 399 }],
    ["25% korting", { type: "percentage_off", percent: 25 }],
    ["€1,50 korting", { type: "amount_off", amountCents: 150 }],
    ["Nu extra voordelig", { type: "unknown" }],
  ])("%s", (label, expected) => {
    expect(parseFeedLabel(label)).toEqual(expected);
  });
});

describe("normalizeFeed", () => {
  test("maakt een volwaardige aanbieding met bron en actualisatiedatum", () => {
    const { offers, issues } = normalizeFeed(file([row()]), { nowIso: NOW });
    expect(issues).toEqual([]);
    expect(offers).toHaveLength(1);
    const offer = offers[0]!;
    expect(offer.id).toBe("kruidvat:123");
    expect(offer.source).toBe("kruidvat");
    expect(offer.provenance).toBe("partner-feed");
    expect(offer.fetchedAt).toBe("2026-10-04T10:00:00.000Z");
    expect(offer.mechanism).toEqual({ type: "price_drop" });
    expect(offer.pricing).toEqual({
      currentPriceCents: 299,
      originalPriceCents: 499,
      savingsAbsoluteCents: 200,
      savingsPercent: 40,
    });
  });

  test("een 'was'-prijs die niet hoger is, wordt geschrapt in plaats van getoond", () => {
    const { offers, issues } = normalizeFeed(
      file([row({ originalPriceCents: 299, label: "Actie" })]),
      { nowIso: NOW },
    );
    expect(offers[0]!.pricing.originalPriceCents).toBeNull();
    expect(offers[0]!.pricing.savingsPercent).toBeNull();
    expect(issues.join()).toContain("niet hoger");
  });

  test("zonder einddatum of met een eeuwige looptijd komt een actie er niet in", () => {
    const { offers, issues } = normalizeFeed(
      file([
        row({ id: "a", validUntil: "" }),
        row({ id: "b", validUntil: "2027-06-01" }),
        row({ id: "c" }),
      ]),
      { nowIso: NOW },
    );
    expect(offers.map((o) => o.sourceOfferId)).toEqual(["c"]);
    expect(issues).toHaveLength(2);
  });

  test("ongeloofwaardige kortingen worden tegengehouden", () => {
    const { offers } = normalizeFeed(file([row({ priceCents: 10, originalPriceCents: 999 })]), {
      nowIso: NOW,
    });
    expect(offers).toHaveLength(0);
  });

  test("links naar een ander domein worden genegeerd, behalve bij affiliatefeeds", () => {
    const evil = row({ url: "https://example.com/phish" });
    const partner = normalizeFeed(file([evil]), { nowIso: NOW });
    expect(partner.offers[0]!.url).toBeUndefined();

    const affiliate = normalizeFeed(file([evil], { provenance: "affiliate-feed" }), { nowIso: NOW });
    expect(affiliate.offers[0]!.url).toBe("https://example.com/phish");
  });

  test("hetzelfde product twee keer: de goedkoopste blijft", () => {
    const { offers, issues } = normalizeFeed(
      file([row({ id: "1", priceCents: 349 }), row({ id: "2", priceCents: 299 })]),
      { nowIso: NOW },
    );
    expect(offers.map((o) => o.sourceOfferId)).toEqual(["2"]);
    expect(issues.join()).toContain("zelfde product");
  });

  test("een verouderd bestand publiceert niets", () => {
    expect(() =>
      normalizeFeed(file([row()], { updatedAt: "2026-09-01T00:00:00Z" }), { nowIso: NOW }),
    ).toThrow(/ouder dan/);
  });

  test("zonder vastgelegde gebruiksgrond geen publicatie", () => {
    expect(() => normalizeFeed(file([row()], { licence: "" }), { nowIso: NOW })).toThrow(/licence/);
  });

  test("onbekende retailers en een verkeerde bestandsnaam worden geweigerd", () => {
    expect(() => normalizeFeed(file([row()], { retailer: "nepwinkel" }), { nowIso: NOW })).toThrow(
      /onbekende retailer/,
    );
    expect(() =>
      normalizeFeed(file([row()]), { nowIso: NOW, expectedRetailer: "etos" }),
    ).toThrow(/bestandsnaam/);
  });
});

describe("feedAdapters", () => {
  test("één adapter per bestand, onbekende voorvoegsels overgeslagen", async () => {
    const dir = mkdtempSync(join(tmpdir(), "superscout-feeds-"));
    writeFileSync(join(dir, "kruidvat.week41.json"), JSON.stringify(file([row()])));
    writeFileSync(join(dir, "nepwinkel.json"), "{}");
    writeFileSync(join(dir, "leesmij.txt"), "geen feed");

    const skipped: string[] = [];
    const adapters = feedAdapters(dir, (line) => skipped.push(line));
    expect(adapters.map((a) => a.source)).toEqual(["kruidvat"]);
    expect(skipped).toHaveLength(1);
  });

  test("zonder map is er gewoon niets te doen", () => {
    expect(feedAdapters(undefined)).toEqual([]);
    expect(feedAdapters("/bestaat/echt/niet")).toEqual([]);
  });

  test("de adapter leest, valideert en meldt afgekeurde regels", async () => {
    const lines: string[] = [];
    const adapter = new FeedFileAdapter(
      "kruidvat",
      "kruidvat.json",
      () => NOW,
      () => JSON.stringify(file([row(), row({ id: "kapot", validFrom: "gisteren" })])),
      (line) => lines.push(line),
    );
    const offers = await adapter.fetchOffers();
    expect(offers).toHaveLength(1);
    expect(lines.join()).toContain("kapot");
  });
});

describe("het voorbeeld in docs/feeds", () => {
  test("is een geldig bestand, zodat de documentatie niet gaat liegen", async () => {
    const { readFileSync } = await import("node:fs");
    const raw = JSON.parse(
      readFileSync(join(__dirname, "..", "..", "..", "docs", "feeds", "kruidvat.voorbeeld.json"), "utf-8"),
    );
    const { offers, issues } = normalizeFeed(raw, { nowIso: NOW, expectedRetailer: "kruidvat" });
    expect(issues).toEqual([]);
    expect(offers).toHaveLength(2);
    expect(offers[1]!.mechanism).toEqual({ type: "buy_x_get_y_free", buyQuantity: 1, freeQuantity: 1 });
  });
});
