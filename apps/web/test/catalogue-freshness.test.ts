import { describe, expect, test } from "vitest";
import {
  INDEXABLE_MAX_AGE_DAYS,
  indexableSince,
  PRICE_MARKUP_MAX_AGE_DAYS,
  priceFreshness,
} from "@/lib/catalogue-freshness";

/**
 * Albert Heijn's robots.txt paused the catalogue crawl, and 22.000 product
 * pages went on saying "kost op dit moment" and handing Google a Product price
 * to show as today's. These tests pin down how much a price may still claim as
 * it ages.
 */
describe("priceFreshness", () => {
  const NOW = new Date("2026-10-01T12:00:00.000Z");
  const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

  test("last night's crawl is current", () => {
    expect(priceFreshness(daysAgo(0.3), NOW)).toBe("current");
  });

  test("one missed week is still current, so a single failed run does not strip markup", () => {
    expect(priceFreshness(daysAgo(PRICE_MARKUP_MAX_AGE_DAYS), NOW)).toBe("current");
  });

  test("past a week the price is dated: shown, but no longer stated as today's", () => {
    // The live situation on 2026-10-01: both catalogues last crawled 2026-09-18.
    expect(priceFreshness("2026-09-18T03:00:00.000Z", NOW)).toBe("dated");
  });

  test("past a month the page stops being worth indexing", () => {
    expect(priceFreshness(daysAgo(INDEXABLE_MAX_AGE_DAYS + 1), NOW)).toBe("expired");
  });

  test("an unreadable timestamp claims nothing", () => {
    expect(priceFreshness("", NOW)).toBe("expired");
    expect(priceFreshness("onzin", NOW)).toBe("expired");
  });
});

describe("indexableSince", () => {
  test("is a UTC midnight, so the sitemap index and its cached chunks agree all day", () => {
    const morning = indexableSince(new Date("2026-10-01T01:00:00.000Z"));
    const evening = indexableSince(new Date("2026-10-01T23:00:00.000Z"));

    expect(morning).toBe(evening);
    expect(morning).toBe("2026-09-01T00:00:00.000Z");
  });

  test("sorts against stored ISO timestamps the way time does", () => {
    // The catalogue compares it to fetched_at as text; that only works if the
    // format matches what the crawlers write (Date#toISOString).
    const cutoff = indexableSince(new Date("2026-10-01T12:00:00.000Z"));
    expect("2026-09-18T03:00:00.000Z" >= cutoff).toBe(true);
    expect("2026-08-31T23:59:59.999Z" >= cutoff).toBe(false);
  });
});
