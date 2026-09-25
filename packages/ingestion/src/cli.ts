/**
 * Live ingestion worker. Runs the source adapters and writes the offers that
 * are valid *today* to a JSON file the web app reads at runtime. Runs once on
 * start, then every morning.
 *
 * Env:
 *   OFFERS_OUT   output path (default /data/offers.json)
 *   CATALOGUE_DB SQLite path for the product catalogue (default /data/superscout.db)
 *   SKIP_ASSORTMENT set to "1" to run only the promotion pull
 *   ARCHIVE_OUT  archive path (default /data/offers-archive.json)
 *   INGEST_HOUR  UTC hour of the daily run (default 5 ≈ 07:00 NL summer)
 *   INGEST_ONCE  set to "1" to run a single pass and exit
 *   FEEDS_DIR    directory of partner/affiliate/manual feed files (default /data/feeds)
 */
import { appendFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
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
import { crawlAhAssortment, crawlJumboAssortment } from "./assortment-runner";
import { SqliteProductStore } from "./store/sqlite-product-store";
import { apiAdapters } from "./sources";
import { feedAdapters } from "./adapters/feed/feed.adapter";
import { browserSources } from "./browser/browser-sources";
import { launchBrowser } from "./browser/intercept";
import { DIR_FOR_WEB, READ_FOR_WEB, shareWithWeb } from "./shared-volume";

/**
 * Write a file so that a reader never sees it half-written.
 *
 * `writeFileSync` truncates first and fills after, so a process killed mid-call
 * leaves a partial file behind. That is not theoretical: six deploys in one day,
 * each recreating this container, left `/data/offers.json` unparseable — and the
 * web app fell back to the bundled July snapshot and served it as this week's
 * offers. Writing to a sibling and renaming is atomic on the same filesystem, so
 * a reader sees either the previous file or the complete new one.
 */
function writeAtomic(path: string, contents: string): void {
  const temp = `${path}.tmp`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(temp, contents, { encoding: "utf-8" });
  // Ownership before the rename, so the file is never briefly unreadable to the
  // web app. Permissions cannot be inherited here: writeFileSync keeps an
  // existing file's mode, which hid the problem for as long as this overwrote
  // in place — a fresh temp file starts from the worker's umask as root.
  shareWithWeb(temp, READ_FOR_WEB);
  renameSync(temp, path);
  shareWithWeb(dirname(path), DIR_FOR_WEB);
}

const OUT = process.env.OFFERS_OUT ?? "/data/offers.json";
const ARCHIVE_OUT = process.env.ARCHIVE_OUT ?? "/data/offers-archive.json";
const HISTORY_OUT = process.env.PRICE_HISTORY_OUT ?? "/data/price-history.jsonl";
const CATALOGUE_DB = process.env.CATALOGUE_DB ?? "/data/superscout.db";
const INGEST_HOUR = Number(process.env.INGEST_HOUR ?? 5);
const FEEDS_DIR = process.env.FEEDS_DIR ?? "/data/feeds";

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
    writeAtomic(ARCHIVE_OUT, JSON.stringify(archive));
    console.log(
      `[ingest] archive: ${archive.length} offers retained (${ARCHIVE_RETENTION_DAYS}d, ` +
        `${archive.length - previous.length >= 0 ? "+" : ""}${archive.length - previous.length}) -> ${ARCHIVE_OUT}.`,
    );
  } catch (e) {
    console.error("[ingest] archive write failed (offers still written):", e);
  }
}

/**
 * Refresh the product catalogue.
 *
 * Runs after the promotions, and best-effort like the price history: the
 * catalogue is a growth project, while the promotions are what the site shows
 * today. A failed crawl must never be the reason a day's offers do not publish.
 */
async function crawlCatalogue(): Promise<void> {
  if (process.env.SKIP_ASSORTMENT === "1") {
    console.log("[assortment] overgeslagen (SKIP_ASSORTMENT=1)");
    return;
  }

  let store: SqliteProductStore | null = null;
  try {
    store = new SqliteProductStore(CATALOGUE_DB);
    const log = (line: string) => console.log(line);

    // Sequential, not parallel: two crawls hammering two chains at once is both
    // rude and a good way to get rate-limited off one of them.
    for (const crawl of [crawlAhAssortment, crawlJumboAssortment]) {
      const report = await crawl(store, { onProgress: log });
      if (report.aislesFailed > 0) {
        console.error(
          `[assortment] ${report.source}: ${report.aislesFailed} onderdelen faalden:`,
          report.errors.slice(0, 5),
        );
      }
    }
  } catch (e) {
    console.error("[assortment] crawl mislukt (aanbiedingen staan er wel):", e);
  } finally {
    await store?.close();
  }
}

async function ingestOnce(): Promise<void> {
  const nowIso = new Date().toISOString();
  const store = new InMemoryOfferStore();

  // Feed files first: they need no network, so they report even on a day the
  // chains' websites are unreachable.
  const adapters = [...feedAdapters(FEEDS_DIR), ...apiAdapters()];
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

  writeAtomic(OUT, JSON.stringify(offers));
  console.log(`[ingest] ${nowIso} wrote ${offers.length}/${all.length} active offers -> ${OUT}.`);

  retainArchive(all, nowIso);
  recordPrices(offers, nowIso);
  await crawlCatalogue();
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
