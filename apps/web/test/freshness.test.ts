import { describe, expect, test } from "vitest";
import { freshnessLabel } from "@/lib/format";

/**
 * Five of the eight live chains are DOM-scraped and never supply an end date,
 * so 47% of offers reached the card with an empty `validUntil` and rendered a
 * blank where the validity line belongs. A shopper reads that blank as "no idea
 * whether this still counts" — the exact doubt the site exists to remove.
 */
describe("freshnessLabel", () => {
  const NOW = "2026-08-30T12:00:00.000Z";

  test("says today when the data was fetched this morning", () => {
    expect(freshnessLabel("2026-08-30T05:00:00.000Z", NOW)).toBe("vandaag opgehaald");
  });

  test("says yesterday one day back", () => {
    expect(freshnessLabel("2026-08-29T05:00:00.000Z", NOW)).toBe("gisteren opgehaald");
  });

  test("falls back to a date once it is older than that", () => {
    expect(freshnessLabel("2026-08-26T05:00:00.000Z", NOW)).toBe("opgehaald 26-08");
  });

  test("admits ignorance rather than inventing a date", () => {
    // Never claim freshness we cannot back: an unknown fetch time must not
    // silently render as "vandaag".
    expect(freshnessLabel(null, NOW)).toBe("geldigheid onbekend");
    expect(freshnessLabel("onzin", NOW)).toBe("geldigheid onbekend");
  });

  test("a clock skew into the future still reads as today, not negative days", () => {
    expect(freshnessLabel("2026-08-31T05:00:00.000Z", NOW)).toBe("vandaag opgehaald");
  });
});
