import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/**
 * The offer-driven routes must read at request time.
 *
 * This failure is invisible in every way that normally catches a bug: the
 * build succeeds, the container starts, the data file is correct and readable,
 * the tests pass, and the site serves 200s. It just serves the emptiness that
 * was true during `docker build`, because OFFERS_PATH points at a volume that
 * does not exist yet at that point. With `revalidate` that state is cached and
 * shipped; the page only ever corrects itself if something happens to request
 * it after the window, and a low-traffic site cannot rely on that.
 *
 * So the render mode is asserted rather than assumed. A future `revalidate`
 * here is not a performance tweak — it takes the homepage offline in a way
 * that looks like a working deploy.
 */
const APP = join(__dirname, "..", "src", "app");

const REQUEST_TIME_ROUTES = [
  "page.tsx",
  "sitemap.ts",
  "acties/page.tsx",
  "beheer/page.tsx",
  "beste-aanbiedingen/page.tsx",
  "categorieen/page.tsx",
  "feed.xml/route.ts",
  "mandje/page.tsx",
  "privacy/page.tsx",
  "product/page.tsx",
  "volgende-week/page.tsx",
  "winkels/page.tsx",
];

describe("offer-driven routes are not baked into the build", () => {
  test.each(REQUEST_TIME_ROUTES)("%s renders per request", (route) => {
    const source = readFileSync(join(APP, route), "utf-8");

    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).not.toMatch(/export const revalidate\b/);
  });

  test("every route listed here still exists", () => {
    // A renamed route would otherwise drop out of the check silently.
    for (const route of REQUEST_TIME_ROUTES) {
      expect(() => readFileSync(join(APP, route), "utf-8")).not.toThrow();
    }
  });
});
