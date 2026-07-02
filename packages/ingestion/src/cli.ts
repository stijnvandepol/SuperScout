/**
 * Live ingestion worker. Runs the source adapters and writes the offers that
 * are valid *today* to a JSON file the web app reads at runtime. Runs once on
 * start, then every morning.
 *
 * Env:
 *   OFFERS_OUT   output path (default /data/offers.json)
 *   INGEST_HOUR  UTC hour of the daily run (default 5 ≈ 07:00 NL summer)
 *   INGEST_ONCE  set to "1" to run a single pass and exit
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Browser } from "playwright";
import { InMemoryOfferStore, isActive } from "@superscout/core";
import { runIngestion } from "./runner";
import { apiAdapters } from "./sources";
import { browserSources } from "./browser/browser-sources";
import { launchBrowser } from "./browser/intercept";

const OUT = process.env.OFFERS_OUT ?? "/data/offers.json";
const INGEST_HOUR = Number(process.env.INGEST_HOUR ?? 5);

async function ingestOnce(): Promise<void> {
  const nowIso = new Date().toISOString();
  const store = new InMemoryOfferStore();

  const adapters = apiAdapters();
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    adapters.push(...browserSources(browser));
  } catch (e) {
    console.error("[ingest] browser unavailable, skipping browser-driven chains:", e);
  }

  let all;
  try {
    const report = await runIngestion(adapters, store, { timeoutMs: 60_000 });
    logReport(report);
    all = await store.all();
  } finally {
    if (browser) await browser.close();
  }

  // Only keep offers that are actually valid today (drop next-week/expired).
  const offers = all.filter((o) => isActive(o.validFrom, o.validUntil, nowIso));

  if (offers.length === 0) {
    // Never overwrite good data with an empty pull (all sources failed).
    console.error(`[ingest] ${nowIso} no active offers, keeping previous file.`);
    return;
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(offers), "utf-8");
  console.log(`[ingest] ${nowIso} wrote ${offers.length}/${all.length} active offers -> ${OUT}.`);
}

function logReport(report: { results: { source: string; ok: boolean; offerCount: number; error?: string }[] }): void {
  const summary = report.results
    .map((r) => `${r.source}=${r.ok ? r.offerCount : `FAIL(${r.error ?? "?"})`}`)
    .join(" ");
  console.log(`[ingest] sources: ${summary}`);
}

/** Milliseconds until the next occurrence of `hour:00` UTC. */
function msUntilNextRun(hour: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(hour, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

async function main(): Promise<void> {
  await ingestOnce().catch((e) => console.error("[ingest] run failed", e));
  if (process.env.INGEST_ONCE === "1") return;

  const scheduleNext = () => {
    const ms = msUntilNextRun(INGEST_HOUR);
    console.log(`[ingest] next run in ${Math.round(ms / 3_600_000)}h (${INGEST_HOUR}:00 UTC)`);
    setTimeout(() => {
      void ingestOnce()
        .catch((e) => console.error("[ingest] run failed", e))
        .finally(scheduleNext);
    }, ms);
  };
  scheduleNext();
}

void main();
