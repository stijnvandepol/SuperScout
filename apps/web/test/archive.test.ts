import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Offer } from "@superscout/core";

/**
 * End-to-end check on the fix for the 848 "not found (404)" pages Search
 * Console was reporting: a promotion that has ended must still resolve from
 * disk, marked expired, instead of disappearing with the weekly rollover.
 *
 * Real files and a real module load, because the bug being guarded against
 * lives precisely in the file/env/cache plumbing that a mock would replace.
 */

function offer(partial: Partial<Offer> & { sourceOfferId: string }): Offer {
  return {
    id: `dirk:${partial.sourceOfferId}`,
    source: "dirk",
    title: "Brabantia melkopschuimer",
    pricing: {
      currentPriceCents: 1299,
      originalPriceCents: 1999,
      savingsAbsoluteCents: 700,
      savingsPercent: 35,
    },
    mechanism: { type: "price_drop" },
    validFrom: "2020-01-01",
    validUntil: "2020-01-07",
    flags: {},
    fetchedAt: "2020-01-01T05:00:00.000Z",
    ...partial,
  } as Offer;
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "superscout-archive-"));
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

describe("verlopen aanbiedingen", () => {
  test("een afgelopen actie blijft oplosbaar en wordt als verlopen gemarkeerd", async () => {
    const expired = offer({ sourceOfferId: "137769" });
    writeFiles([], [expired]);

    const { resolveBySlug } = await import("@/lib/offers");
    const resolved = resolveBySlug("dirk-137769");

    expect(resolved).toBeDefined();
    expect(resolved?.status).toBe("expired");
    expect(resolved?.offer.title).toBe("Brabantia melkopschuimer");
  });

  test("een onbekende slug blijft een 404 — het archief maakt niet alles geldig", async () => {
    writeFiles([], [offer({ sourceOfferId: "137769" })]);

    const { resolveBySlug } = await import("@/lib/offers");
    expect(resolveBySlug("dirk-bestaat-niet")).toBeUndefined();
  });

  test("een lopende actie wint van de gearchiveerde kopie", async () => {
    const live = offer({
      sourceOfferId: "137769",
      // Running *now*: started in the past, ends far ahead. A 2099 start would
      // make it upcoming, not active.
      validFrom: "2020-01-01",
      validUntil: "2099-12-31",
      pricing: {
        currentPriceCents: 1099,
        originalPriceCents: 1999,
        savingsAbsoluteCents: 900,
        savingsPercent: 45,
      },
    });
    writeFiles([live], [offer({ sourceOfferId: "137769" })]);

    const { resolveBySlug } = await import("@/lib/offers");
    const resolved = resolveBySlug("dirk-137769");

    expect(resolved?.status).toBe("active");
    expect(resolved?.offer.pricing.currentPriceCents).toBe(1099);
  });

  test("hetzelfde product dat nu elders in de actie staat wordt gevonden", async () => {
    const expired = offer({ sourceOfferId: "137769" });
    const currentElsewhere = {
      ...offer({ sourceOfferId: "999" }),
      id: "jumbo:999",
      source: "jumbo",
      validFrom: "2020-01-01",
      validUntil: "2099-12-31",
    } as Offer;
    writeFiles([currentElsewhere], [expired]);

    const { currentEquivalent } = await import("@/lib/offers");
    expect(currentEquivalent(expired)?.source).toBe("jumbo");
  });

  test("toekomstige acties komen op de 'volgende week'-pagina terecht", async () => {
    const upcoming = offer({
      sourceOfferId: "140000",
      validFrom: "2099-01-01",
      validUntil: "2099-01-07",
    });
    writeFiles([], [upcoming, offer({ sourceOfferId: "137769" })]);

    const { upcomingOffers } = await import("@/lib/offers");
    const result = upcomingOffers();

    expect(result).toHaveLength(1);
    expect(result[0]?.sourceOfferId).toBe("140000");
  });

  test("onrenderbare records worden aan de grens gedropt in plaats van een 500 te veroorzaken", async () => {
    // The shape that produced the 18 server errors: a mechanism type outside
    // the union, which makes mechanismDescription() return undefined and its
    // caller's .includes() throw mid-render.
    const broken = { ...offer({ sourceOfferId: "bad" }), mechanism: { type: "verzonnen" } };
    const good = offer({ sourceOfferId: "137769" });
    writeFiles([], [broken as unknown as Offer, good]);

    const { getArchivedOffers, resolveBySlug } = await import("@/lib/offers");
    expect(getArchivedOffers()).toHaveLength(1);
    expect(resolveBySlug("dirk-bad")).toBeUndefined();
    expect(resolveBySlug("dirk-137769")).toBeDefined();
  });

  test("zonder ARCHIVE_PATH werkt de site gewoon, alleen zonder archief", async () => {
    const { getArchivedOffers, resolveBySlug } = await import("@/lib/offers");
    expect(getArchivedOffers()).toEqual([]);
    expect(resolveBySlug("dirk-137769")).toBeUndefined();
  });
});
