import { chromium, type Browser } from "playwright";

const UA_IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1";

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
}

/**
 * Load a page and return the JSON body of the first successful response whose
 * URL contains `matchUrl`. This is how we read a chain's own offers API through
 * its website — the browser handles JS, cookies and bot-protection for us.
 */
export async function interceptJson<T>(
  browser: Browser,
  pageUrl: string,
  matchUrl: string,
  options: InterceptOptions = {},
): Promise<T> {
  const { settleMs = 4000, timeoutMs = 45000 } = options;
  const page = await browser.newPage({ userAgent: UA_IPHONE, locale: "nl-NL" });
  try {
    let captured: T | null = null;
    page.on("response", (resp) => {
      if (captured || !resp.url().includes(matchUrl) || !resp.ok()) return;
      resp
        .json()
        .then((body: T) => {
          captured = body;
        })
        .catch(() => {});
    });

    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    const deadline = Date.now() + settleMs + 6000;
    while (!captured && Date.now() < deadline) {
      await page.waitForTimeout(300);
    }
    if (!captured) throw new Error(`no response matching "${matchUrl}" at ${pageUrl}`);
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
  const { timeoutMs = 45000 } = options;
  const page = await browser.newPage({ userAgent: UA_IPHONE, locale: "nl-NL" });
  try {
    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    // Auto-scroll to load lazy tiles.
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(800);
    return await page.evaluate(extractor);
  } finally {
    await page.close();
  }
}
