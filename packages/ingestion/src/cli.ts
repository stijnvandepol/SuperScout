/**
 * Live ingestion worker. Runs the source adapters and writes the offers that
 * are valid *today* to a JSON file the web app reads at runtime. Runs once on
 * start, then every morning.
 *
 * Env:
 *   OFFERS_OUT   output path (default /data/offers.json)
 *   ARCHIVE_OUT  archive path (default /data/offers-archive.json)
 *   INGEST_HOUR  UTC hour of the daily run (default 5 ≈ 07:00 NL summer)
 *   INGEST_ONCE  set to "1" to run a single pass and exit
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Browser } from "playwright";
import type { Offer, PriceObservation } from "@superscout/core";
import {
  ARCHIVE_RETENTION_DAYS,
  InMemoryOfferStore,
  isActive,
  mergeArchive,
  newObservations,
  observationsFrom,
  parseObservations,
  serialiseObservations,
} from "@superscout/core";
import { runIngestion } from "./runner";
import { apiAdapters } from "./sources";
import { browserSources } from "./browser/browser-sources";
import { launchBrowser } from "./browser/intercept";

const OUT = process.env.OFFERS_OUT ?? "/data/offers.json";
const ARCHIVE_OUT = process.env.ARCHIVE_OUT ?? "/data/offers-archive.json";
const HISTORY_OUT = process.env.PRICE_HISTORY_OUT ?? "/data/price-history.jsonl";
const INGEST_HOUR = Number(process.env.INGEST_HOUR ?? 5);

/**
 * Append today's prices to the running history.
 *
 * Deliberately best-effort: this is a long game whose payoff is a year away,
 * and it must never be the reason a day's offers fail to publish. Idempotent,
 * so a restart or a second run on the same day changes nothing.
 */
function recordPrices(offers: Offer[], nowIso: string): void {
  try {
    let existing: PriceObservation[] = [];
    try {
      existing = parseObservations(readFileSync(HISTORY_OUT, "utf-8"));
    } catch {
      // No history yet — the first run creates it.
    }

    const fresh = newObservations(existing, observationsFrom(offers, nowIso));
    if (fresh.length === 0) {
      console.log(`[ingest] price history already current (${existing.length} observations).`);
      return;
    }

    mkdirSync(dirname(HISTORY_OUT), { recursive: true });
    appendFileSync(HISTORY_OUT, `${serialiseObservations(fresh)}\n`, "utf-8");
    console.log(
      `[ingest] recorded ${fresh.length} prices -> ${HISTORY_OUT} (${existing.length + fresh.length} total).`,
    );
  } catch (e) {
    console.error("[ingest] price history append failed (offers still written):", e);
  }
}

/**
 * Fold this pull into the retained archive of expired promotions.
 *
 * `OFFERS_OUT` deliberately stays "valid today" — that is the hot path the site
 * reads on every request and it must stay small. This second file is the long
 * tail: every promotion we have seen in the last `ARCHIVE_RETENTION_DAYS`,
 * including the ones that ended, so their URLs keep resolving instead of
 * turning into the 848 404s Search Console was reporting.
 *
 * Fed the *unfiltered* pull, so next-week promotions land here too and the
 * "volgende week" page has something to show.
 *
 * Best-effort, like the price history: an archive that fails to write must
 * never stop today's offers from publishing.
 */
function retainArchive(all: Offer[], nowIso: string): void {
  try {
    let previous: Offer[] = [];
    try {
      previous = JSON.parse(readFileSync(ARCHIVE_OUT, "utf-8")) as Offer[];
    } catch {
      // First run, or the file was never mounted — start from this pull.
    }

    const archive = mergeArchive(previous, all, nowIso);
    mkdirSync(dirname(ARCHIVE_OUT), { recursive: true });
    writeFileSync(ARCHIVE_OUT, JSON.stringify(archive), "utf-8");
    console.log(
      `[ingest] archive: ${archive.length} offers retained (${ARCHIVE_RETENTION_DAYS}d, ` +
        `${archive.length - previous.length >= 0 ? "+" : ""}${archive.length - previous.length}) -> ${ARCHIVE_OUT}.`,
    );
  } catch (e) {
    console.error("[ingest] archive write failed (offers still written):", e);
  }
}

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

  retainArchive(all, nowIso);
  recordPrices(offers, nowIso);
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
