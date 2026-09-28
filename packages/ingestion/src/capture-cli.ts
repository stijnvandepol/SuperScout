/**
 * Capture a retailer's offers page, for building or repairing its module.
 *
 *   node dist/capture.cjs <slug> [url]
 *
 * Opens the page the way the worker would — robots.txt checked, under our own
 * User-Agent, one navigation — and writes to CAPTURE_DIR/<slug>/<timestamp>/:
 *
 *   page.html     the rendered page: a parser test fixture
 *   json-NN.json  every JSON response the page loaded itself
 *   index.json    what was seen, with the responses that look like an offer
 *                 list flagged, so the JSON source is found before anyone
 *                 writes an HTML parser
 *
 * Without a URL it uses the retailer's offers page from the core registry,
 * which is how a chain that has no module yet gets its first look.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isRetailerSlug, RETAILERS } from "@superscout/core";
import { launchBrowser } from "./browser/intercept";
import { HONEST_USER_AGENT, polite, sharedThrottle } from "./http/polite";
import { RobotsPolicy } from "./robots";
import { moduleFor } from "./retailers";
import { offerListHints } from "./capture-hints";

const CAPTURE_DIR = process.env.CAPTURE_DIR ?? "/data/captures";

async function main(): Promise<void> {
  const [slug, urlArg] = process.argv.slice(2);
  if (!slug || !isRetailerSlug(slug)) {
    console.error("gebruik: capture <slug> [url]  — slug uit packages/core/src/retailer.ts");
    process.exit(1);
  }
  const url = urlArg ?? moduleFor(slug)?.urls[0] ?? RETAILERS[slug].offersUrl;

  const robots = new RobotsPolicy(async (u) => {
    const res = await polite(u, { signal: AbortSignal.timeout(10_000) });
    return { status: res.status, body: (await res.text()).slice(0, 500_000) };
  });
  const reason = await robots.check(url);
  if (reason) {
    console.error(`[capture] niet opgehaald: ${reason}`);
    process.exit(2);
  }

  const dir = join(CAPTURE_DIR, slug, new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(dir, { recursive: true });

  const browser = await launchBrowser();
  const seen: { n: number; url: string; status: number; bytes: number; hints: string[] }[] = [];
  try {
    await sharedThrottle.wait(new URL(url).host);
    const page = await browser.newPage({ userAgent: HONEST_USER_AGENT, locale: "nl-NL" });
    const pending: Promise<void>[] = [];
    page.on("response", (resp) => {
      if (!(resp.headers()["content-type"] ?? "").includes("json")) return;
      pending.push(
        resp
          .text()
          .then((text) => {
            const n = seen.length + 1;
            let hints: string[] = [];
            try {
              hints = offerListHints(JSON.parse(text));
            } catch {
              // Not valid JSON after all; keep the raw text.
            }
            writeFileSync(join(dir, `json-${String(n).padStart(2, "0")}.json`), text, "utf-8");
            seen.push({ n, url: resp.url(), status: resp.status(), bytes: text.length, hints });
          })
          .catch(() => {}),
      );
    });

    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    if (res && [401, 403, 429].includes(res.status())) {
      console.error(`[capture] de site weigerde ons (${res.status()}); gestopt.`);
      process.exit(3);
    }
    // Generous on purpose: PLUS only requests its list once it scrolls into
    // view, well after the page looks loaded. One capture is one visit.
    for (let i = 0; i < 20; i++) {
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(600);
    }
    await page.waitForTimeout(4000);
    await Promise.all(pending);
    writeFileSync(join(dir, "page.html"), await page.content(), "utf-8");
  } finally {
    await browser.close();
  }

  writeFileSync(join(dir, "index.json"), JSON.stringify({ url, capturedAt: new Date().toISOString(), json: seen }, null, 2));
  console.log(`[capture] ${slug}: pagina + ${seen.length} JSON-responses -> ${dir}`);
  for (const s of seen.filter((x) => x.hints.length)) {
    console.log(`  json-${String(s.n).padStart(2, "0")} ${new URL(s.url).pathname}: ${s.hints.slice(0, 3).join("; ")}`);
  }
}

main().catch((e) => {
  console.error("[capture] mislukt:", e);
  process.exit(1);
});
