import { describe, expect, test } from "vitest";
import type { Product } from "../src/product";
import { isCanonicalSlug, productPath, titleSlug } from "../src/product-identity";

function product(title: string, id = "618268"): Product {
  return {
    id: `ah:${id}`,
    source: "ah",
    sourceProductId: id,
    title,
    priceCents: 716,
    fetchedAt: "2026-09-18T05:00:00.000Z",
  };
}

describe("titleSlug", () => {
  test("turns a product title into a readable URL tail", () => {
    expect(titleSlug("AH Smeuige pindakaas 2-pack")).toBe("ah-smeuige-pindakaas-2-pack");
  });

  test("folds diacritics so Calvé and Calve agree", () => {
    expect(titleSlug("Calvé Pindakaas")).toBe("calve-pindakaas");
  });

  test("spells out the ampersand rather than dropping it", () => {
    // "Kip & kalkoen" losing the & would read as "kip kalkoen"; spelling it out
    // keeps the slug pronounceable.
    expect(titleSlug("Kip & kalkoen")).toBe("kip-en-kalkoen");
  });

  test("collapses punctuation without leaving stray dashes", () => {
    expect(titleSlug("  AH  Goudse   Belegen 48+ / pondstuk  ")).toBe(
      "ah-goudse-belegen-48-pondstuk",
    );
  });

  test("caps the length without ending on a dash", () => {
    const slug = titleSlug("A".repeat(50) + " " + "B".repeat(50));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });

  test("a title with nothing slugifiable yields an empty tail, not a crash", () => {
    expect(titleSlug("!!!")).toBe("");
  });
});

describe("productPath", () => {
  test("puts the id before the slug so a rewording cannot break the URL", () => {
    // This is the point of the whole scheme: offer URLs died weekly because they
    // were keyed on a promotion. Keying on the title instead would die more
    // slowly, every time a chain rewords a product.
    expect(productPath(product("AH Smeuige pindakaas 2-pack"))).toBe(
      "/product/ah/618268/ah-smeuige-pindakaas-2-pack",
    );
  });

  test("a reworded product keeps its address", () => {
    const before = productPath(product("AH Smeuige pindakaas"));
    const after = productPath(product("AH Pindakaas smeuig"));

    expect(before).not.toBe(after);
    // Only the decorative tail moved; the resolving part is identical.
    expect(before.split("/").slice(0, 4)).toEqual(after.split("/").slice(0, 4));
  });
});

describe("isCanonicalSlug", () => {
  test("accepts the current spelling", () => {
    expect(isCanonicalSlug(product("AH Smeuige pindakaas"), "ah-smeuige-pindakaas")).toBe(true);
  });

  test("rejects an outdated one, so it can be redirected", () => {
    expect(isCanonicalSlug(product("AH Pindakaas smeuig"), "ah-smeuige-pindakaas")).toBe(false);
  });
});
