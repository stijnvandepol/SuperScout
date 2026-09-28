import { chromium, type Browser, type Page } from "playwright";
import { HONEST_USER_AGENT, sharedThrottle, type HostThrottle } from "../http/polite";

/** Launch a headless Chromium suitable for a container (no sandbox as root). */
export function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
}

export interface InterceptOptions {
  /** Extra wait after load for late XHR (ms). */
  settleMs?: number;
  /** Overall navigation timeout (ms). */
  timeoutMs?: number;
  /** For scrapePage: wait until this selector appears before extracting. */
  waitForSelector?: string;
  throttle?: HostThrottle;
}

/**
 * The last rendered HTML per page URL, kept for the length of one run.
 *
 * When a chain suddenly returns nothing, the first question is always "what
 * did the page look like?" — and by the time anyone asks, the page has moved
 * on. The worker writes this to /data/snapshots when a source looks wrong
 * (see source-health.ts), which also makes it the next test fixture.
 */
export const lastHtml = new Map<string, string>();

/**
 * Open a page the way SuperScout visits any site: under its own name, after
 * waiting its turn for that host. The page's own sub-requests (images, scripts)
 * are the site's doing and are not throttled; the navigation is ours.
 */
async function openPage(browser: Browser, pageUrl: string, options: InterceptOptions): Promise<Page> {
  await (options.throttle ?? sharedThrottle).wait(new URL(pageUrl).host);
  return browser.newPage({ userAgent: HONEST_USER_AGENT, locale: "nl-NL" });
}

/** Decides whether a JSON response is the one we came for. */
export type JsonMatcher = (url: string, body: unknown) => boolean;

/**
 * Load a page and return the first JSON response the matcher accepts.
 *
 * Matching on the *shape* of the body rather than a fixed endpoint name is
 * what keeps this working when a site renames an internal endpoint — PLUS's
 * adapter failed every run for weeks because one OutSystems action got a new
 * name while the data it returned stayed the same. A string still works and
 * means "URL contains".
 *
 * On failure the error lists the JSON endpoints the page did call, so the fix
 * starts from evidence instead of a guess.
 */
export async function interceptJson<T>(
  browser: Browser,
  pageUrl: string,
  match: string | JsonMatcher,
  options: InterceptOptions = {},
): Promise<T> {
  const { settleMs = 4000, timeoutMs = 45000 } = options;
  const accepts: JsonMatcher = typeof match === "string" ? (url) => url.includes(match) : match;
  const page = await openPage(browser, pageUrl, options);
  const seen: string[] = [];
  try {
    let captured: T | null = null;
    page.on("response", (resp) => {
      if (captured || !resp.ok()) return;
      const type = resp.headers()["content-type"] ?? "";
      if (!type.includes("json")) return;
      const url = resp.url();
      resp
        .json()
        .then((body: unknown) => {
          seen.push(new URL(url).pathname);
          if (!captured && accepts(url, body)) captured = body as T;
        })
        .catch(() => {});
    });

    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    const deadline = Date.now() + settleMs + 6000;
    while (!captured && Date.now() < deadline) {
      await page.waitForTimeout(300);
    }
    lastHtml.set(pageUrl, await page.content().catch(() => ""));
    if (!captured) {
      const sample = [...new Set(seen)].slice(0, 8).join(", ") || "geen";
      throw new Error(`geen passende JSON-response op ${pageUrl}; wel gezien: ${sample}`);
    }
    return captured;
  } finally {
    await page.close();
  }
}

/**
 * Load a server-rendered offers page, auto-scroll to trigger lazy loading, then
 * run an in-page extractor. For chains that render offers into the DOM instead
 * of exposing a clean JSON API.
 */
export async function scrapePage<T>(
  browser: Browser,
  pageUrl: string,
  extractor: () => T[],
  options: InterceptOptions = {},
): Promise<T[]> {
  const { timeoutMs = 45000, waitForSelector } = options;
  const page = await openPage(browser, pageUrl, options);
  try {
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    if (waitForSelector) {
      // Client-rendered pages fetch offers after load; wait for the tiles.
      await page.waitForSelector(waitForSelector, { timeout: 15000 }).catch(() => {});
    }
    // Auto-scroll to load lazy tiles.
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(1000);
    lastHtml.set(pageUrl, await page.content().catch(() => ""));
    return await page.evaluate(extractor);
  } finally {
    await page.close();
  }
}
