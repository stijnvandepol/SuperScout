import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Offer } from "@superscout/core";

/**
 * One durable page per product per chain.
 *
 * Search Console showed the site ranking on product names and losing it every
 * week, because each URL belonged to a promotion. These tests pin down the
 * grouping that gives a product one address across promotions, and the rule
 * that only the live file decides what is on offer today.
 */

function offer(partial: Partial<Offer> & { sourceOfferId: string }): Offer {
  return {
    id: `${partial.source ?? "dirk"}:${partial.sourceOfferId}`,
    source: "dirk",
    title: "Ventilator",
    pricing: {
      currentPriceCents: 1999,
      originalPriceCents: 2999,
      savingsAbsoluteCents: 1000,
      savingsPercent: 33,
    },
    mechanism: { type: "price_drop" },
    validFrom: "2020-07-01",
    validUntil: "2020-07-07",
    flags: {},
    fetchedAt: "2020-07-01T05:00:00.000Z",
    ...partial,
  } as Offer;
}

const RUNNING = { validFrom: "2020-01-01", validUntil: "2099-12-31" };

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "superscout-prijs-"));
  vi.resetModules();
});

afterEach(() => {
  delete process.env.ARCHIVE_PATH;
  delete process.env.OFFERS_PATH;
});

function writeFiles(live: Offer[], archived: Offer[]): void {
  const livePath = join(dir, "offers.json");
  const archivePath = join(dir, "archive.json");
  writeFileSync(livePath, JSON.stringify(live), "utf-8");
  writeFileSync(archivePath, JSON.stringify(archived), "utf-8");
  process.env.OFFERS_PATH = livePath;
  process.env.ARCHIVE_PATH = archivePath;
}

describe("prijspagina's", () => {
  test("weekly promotions of one product share one address", async () => {
    // Promotion ids change every week; the product does not.
    writeFiles(
      [],
      [
        offer({ sourceOfferId: "137769", validFrom: "2020-07-01", validUntil: "2020-07-07" }),
        offer({ sourceOfferId: "141002", validFrom: "2020-08-05", validUntil: "2020-08-11" }),
      ],
    );

    const { pricePage, pricePath } = await import("@/lib/price-pages");
    expect(pricePath(offer({ sourceOfferId: "x" }))).toBe("/prijs/dirk/ventilator");

    const page = pricePage("dirk", "ventilator");
    expect(page?.past.map((o) => o.sourceOfferId)).toEqual(["141002", "137769"]);
    expect(page?.live).toEqual([]);
  });

  test("a running promotion is live, and the archive's copy of it is not counted twice", async () => {
    const running = offer({ sourceOfferId: "150000", ...RUNNING });
    writeFiles([running], [running, offer({ sourceOfferId: "137769" })]);

    const { pricePage, promotionCount } = await import("@/lib/price-pages");
    const page = pricePage("dirk", "ventilator")!;

    expect(page.live.map((o) => o.sourceOfferId)).toEqual(["150000"]);
    expect(page.latest.sourceOfferId).toBe("150000");
    expect(promotionCount(page)).toBe(2);
  });

  test("an undated archived promotion is past, not live — the live file decides", async () => {
    // Five chains publish no dates, so their dates can never say "ended".
    const undated = offer({
      source: "dekamarkt",
      sourceOfferId: "136068",
      title: "Sinji car display 7 inch",
      validFrom: "",
      validUntil: "",
    });
    writeFiles([], [undated]);

    const { pricePage } = await import("@/lib/price-pages");
    const page = pricePage("dekamarkt", "sinji-car-display-7-inch");

    expect(page?.live).toEqual([]);
    expect(page?.past).toHaveLength(1);
  });

  test("chains keep their own page for the same product", async () => {
    writeFiles(
      [offer({ source: "aldi", sourceOfferId: "1", ...RUNNING })],
      [offer({ sourceOfferId: "137769" })],
    );

    const { pricePage } = await import("@/lib/price-pages");
    expect(pricePage("dirk", "ventilator")?.live).toEqual([]);
    expect(pricePage("aldi", "ventilator")?.live).toHaveLength(1);
  });

  test("an unknown product has no page", async () => {
    writeFiles([], [offer({ sourceOfferId: "137769" })]);

    const { pricePage } = await import("@/lib/price-pages");
    expect(pricePage("dirk", "bestaat-niet")).toBeUndefined();
  });
});

describe("resolveBySlug voor ongedateerde acties", () => {
  test("an undated promotion missing from the live file has ended", async () => {
    // Before: offerStatus("") said "active", so an August DekaMarkt URL
    // rendered as this week's deal for the archive's full 120 days.
    writeFiles(
      [],
      [offer({ source: "dekamarkt", sourceOfferId: "136068", validFrom: "", validUntil: "" })],
    );

    const { resolveBySlug } = await import("@/lib/offers");
    expect(resolveBySlug("dekamarkt-136068")?.status).toBe("expired");
  });

  test("a published, not yet started promotion stays upcoming", async () => {
    writeFiles([], [offer({ sourceOfferId: "160000", validFrom: "2099-01-01", validUntil: "2099-01-07" })]);

    const { resolveBySlug } = await import("@/lib/offers");
    expect(resolveBySlug("dirk-160000")?.status).toBe("upcoming");
  });
});
