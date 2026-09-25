import { describe, expect, test } from "vitest";
import {
  INGESTED_SUPERMARKETS,
  RETAILERS,
  RETAILER_SLUGS,
  isRetailerSlug,
  retailerNoun,
} from "../src";

describe("winkelregister", () => {
  test("geen slug bevat een streepje — aanbiedings-URL's splitsen daarop", () => {
    for (const slug of RETAILER_SLUGS) expect(slug, slug).not.toContain("-");
  });

  test("elke winkel heeft een naam, kleuren en een https-link", () => {
    for (const slug of RETAILER_SLUGS) {
      const info = RETAILERS[slug];
      expect(info.name.length, slug).toBeGreaterThan(0);
      expect(info.bg, slug).toMatch(/^#[0-9a-f]{6}$/i);
      expect(info.fg, slug).toMatch(/^#[0-9a-f]{6}$/i);
      expect(info.offersUrl, slug).toMatch(/^https:\/\//);
    }
  });

  test("nieuwe winkeltypes staan klaar maar gelden niet als ingelezen", () => {
    expect(isRetailerSlug("kruidvat")).toBe(true);
    expect(isRetailerSlug("onbekend")).toBe(false);
    expect(INGESTED_SUPERMARKETS).not.toContain("kruidvat");
    expect(INGESTED_SUPERMARKETS).toContain("ah");
  });

  test("de woordkeus volgt de mix van winkels", () => {
    expect(retailerNoun(["ah", "jumbo"])).toBe("supermarkten");
    expect(retailerNoun(["ah", "sligro"])).toBe("supermarkten");
    expect(retailerNoun(["ah", "kruidvat"])).toBe("winkels");
    expect(retailerNoun([])).toBe("supermarkten");
  });
});
