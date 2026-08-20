import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Offer } from "@superscout/core";

/**
 * The site must never claim a chain it is not delivering.
 *
 * "Tien supermarkten" was hardcoded in the site-wide meta description, the OG
 * image, the RSS feed, two FAQ answers and the homepage's FAQPage structured
 * data. Four adapters then stopped producing and every one of those became
 * false — the structured data included, which Google reads as markup that
 * misrepresents the page rather than as a stale sentence.
 */

function offer(source: string, id: string): Offer {
  return {
    id: `${source}:${id}`,
    source,
    sourceOfferId: id,
    title: "Test",
    pricing: {
      currentPriceCents: 199,
      originalPriceCents: null,
      savingsAbsoluteCents: null,
      savingsPercent: null,
    },
    mechanism: { type: "price_drop" },
    validFrom: "2020-01-01",
    validUntil: "2099-12-31",
    flags: {},
    fetchedAt: "2026-08-20T05:00:00.000Z",
  } as Offer;
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "superscout-chains-"));
  vi.resetModules();
});

afterEach(() => {
  delete process.env.OFFERS_PATH;
});

function writeLive(offers: Offer[]): void {
  const path = join(dir, "offers.json");
  writeFileSync(path, JSON.stringify(offers), "utf-8");
  process.env.OFFERS_PATH = path;
}

describe("ketenclaims volgen de data", () => {
  test("alleen ketens met aanbiedingen worden genoemd", async () => {
    writeLive([offer("ah", "1"), offer("jumbo", "2"), offer("jumbo", "3")]);

    const { liveChains, chainSentence, chainCount } = await import("@/lib/chains");

    expect(liveChains().map((c) => c.name)).toEqual(["Albert Heijn", "Jumbo"]);
    expect(chainCount()).toBe(2);
    expect(chainSentence()).toBe("Albert Heijn en Jumbo");
  });

  test("een keten zonder aanbiedingen geldt als ontbrekend", async () => {
    writeLive([offer("ah", "1")]);

    const { missingChains } = await import("@/lib/chains");
    const names = missingChains().map((c) => c.name);

    expect(names).toContain("Dirk");
    expect(names).toContain("Lidl");
    expect(names).not.toContain("Albert Heijn");
  });

  test("de zin telt netjes met Nederlandse komma's en 'en'", async () => {
    writeLive([offer("ah", "1"), offer("jumbo", "2"), offer("dirk", "3")]);

    const { chainSentence } = await import("@/lib/chains");
    expect(chainSentence()).toBe("Albert Heijn, Dirk en Jumbo");
  });

  test("boven de leesbaarheidsgrens valt de zin terug op een aantal", async () => {
    writeLive([offer("ah", "1"), offer("jumbo", "2"), offer("dirk", "3")]);

    const { chainSentence } = await import("@/lib/chains");
    expect(chainSentence(2)).toBe("3 Nederlandse supermarkten");
  });

  test("zonder data belooft de site geen enkele keten bij naam", async () => {
    writeLive([]);

    const { chainSentence, chainCount } = await import("@/lib/chains");
    expect(chainCount()).toBe(0);
    expect(chainSentence()).toBe("de grote Nederlandse supermarkten");
  });

  test("het telwoord is Nederlands, niet een cijfer", async () => {
    writeLive([offer("ah", "1"), offer("jumbo", "2"), offer("aldi", "3")]);

    const { chainCountWord } = await import("@/lib/chains");
    expect(chainCountWord()).toBe("drie");
  });
});
