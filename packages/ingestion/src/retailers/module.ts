import type { Browser } from "playwright";
import type { ProductStore, SourceAdapter, SupermarketSlug } from "@superscout/core";
import type { AssortmentReport } from "../assortment-runner";

/**
 * Everything the worker needs to know about one retailer, in that retailer's
 * own folder.
 *
 * A chain used to be spread over six places: the adapter folder, a test file
 * and fixture in test/, a line in sources.ts or browser-sources.ts, its URLs
 * in source-urls.ts and its catalogue crawl in cli.ts. Now `retailers/<slug>/`
 * holds the fetch, parse and normalise code, the tests, the fixtures and this
 * definition. Adding a supermarket is a new folder plus one line in
 * `retailers/index.ts` — see `retailers/README.md`.
 *
 * Display facts (name, colours, sector) stay in @superscout/core's registry,
 * because the website needs them without depending on the scraper.
 */
export interface RetailerModule {
  source: SupermarketSlug;
  /**
   * Every URL the module requests. The robots.txt gate checks all of them
   * before the adapter is allowed to run, so this list must be complete — a
   * test compares it with the URL constants in the folder.
   */
  urls: readonly string[];
  /** "http" runs anywhere; "browser" needs Chromium. */
  needs: "http" | "browser";
  /** Build the adapter. `browser` is null when Chromium could not start. */
  create(ctx: { browser: Browser | null }): SourceAdapter;
  /** Optional full-catalogue crawl, run after the offers. */
  catalogue?: (store: ProductStore, options: { onProgress?: (line: string) => void }) => Promise<AssortmentReport>;
}

/** Identity function that gives a module its type — and a place to hang checks later. */
export function defineRetailer(module: RetailerModule): RetailerModule {
  return module;
}

/**
 * Build a browser adapter, or one that fails with the reason when Chromium is
 * not available — so the chain is reported as failed rather than absent.
 */
export function withBrowser(
  source: SupermarketSlug,
  browser: Browser | null,
  make: (browser: Browser) => SourceAdapter,
): SourceAdapter {
  if (browser) return make(browser);
  return {
    source,
    fetchOffers: async () => {
      throw new Error("browser startte niet; deze keten heeft Chromium nodig");
    },
  };
}
