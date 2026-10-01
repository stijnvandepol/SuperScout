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
 *   STATUS_OUT   per-source result of the last run (default /data/ingest-status.json)
 *   ROBOTS_CACHE last-known-good robots.txt per origin (default /data/robots-cache.json)
 *   ROBOTS_MODE  "enforce" (default) skips chains whose robots.txt forbids us;
 *                "report" only records it in the status
 */
import { appendFileSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
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
import { runIngestion, type IngestionReport } from "./runner";
import { SqliteProductStore } from "./store/sqlite-product-store";
import { feedAdapters } from "./feed/feed.adapter";
import { launchBrowser } from "./browser/intercept";
import { DIR_FOR_WEB, READ_FOR_WEB, shareWithWeb } from "./shared-volume";
import { RobotsPolicy, type RobotsEntry } from "./robots";
import { gateAdapters, isBlockError, type RobotsMode } from "./gate";
import { RETAILER_MODULES } from "./retailers";
import { polite } from "./http/polite";
import { lastHtml } from "./browser/intercept";
import { assessCount, heldOffers, parseHistory, type RunCounts } from "./source-health";
import { acquireLock } from "./run-lock";
import { changedUrls, submitIndexNow } from "./indexnow";

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
const STATUS_OUT = process.env.STATUS_OUT ?? "/data/ingest-status.json";
const ROBOTS_CACHE = process.env.ROBOTS_CACHE ?? "/data/robots-cache.json";
const ROBOTS_MODE: RobotsMode = process.env.ROBOTS_MODE === "report" ? "report" : "enforce";
const COUNTS_OUT = process.env.COUNTS_OUT ?? "/data/ingest-history.jsonl";
const SNAPSHOT_DIR = process.env.SNAPSHOT_DIR ?? "/data/snapshots";
const LOCK_PATH = process.env.LOCK_PATH ?? "/data/ingest.lock";
const SITE_URL = process.env.SITE_URL ?? "https://superscout.nl";
/** Set to "1" to keep the rendered page of every browser chain — for new fixtures. */
const SNAPSHOT_ALL = process.env.SNAPSHOT_ALL === "1";

/**
 * Keep what a chain's pages looked like when its pull went wrong.
 *
 * The five newest per chain are kept; each is also a ready-made test fixture
 * for the parser fix it prompts.
 */
function saveSnapshots(source: string, urls: readonly string[], nowIso: string): void {
  try {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    const stamp = nowIso.slice(0, 16).replace(/[:T]/g, "-");
    urls.forEach((url, i) => {
      const html = lastHtml.get(url);
      if (!html) return;
      writeFileSync(`${SNAPSHOT_DIR}/${source}-${stamp}${urls.length > 1 ? `-${i}` : ""}.html`, html, "utf-8");
    });
    const own = readdirSync(SNAPSHOT_DIR)
      .filter((f) => f.startsWith(`${source}-`) && f.endsWith(".html"))
      .sort();
    for (const old of own.slice(0, Math.max(0, own.length - 5))) unlinkSync(`${SNAPSHOT_DIR}/${old}`);
  } catch (e) {
    console.error(`[ingest] snapshot voor ${source} mislukt:`, e);
  }
}


async function fetchRobots(url: string): Promise<{ status: number; body: string }> {
  const res = await polite(url, { signal: AbortSignal.timeout(10_000), redirect: "follow" });
  // robots.txt is small by definition; RFC 9309 lets us stop at 500 KiB.
  return { status: res.status, body: (await res.text()).slice(0, 500_000) };
}

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

interface StatusResult {
  source: string;
  ok: boolean;
  offerCount: number;
  durationMs: number;
  error?: string;
  /** When the retailer last refused us; set while the backoff runs. */
  blockedSince?: string;
  /** robots.txt objection recorded in "report" mode. */
  robotsWarning?: string;
  /** Why this pull looked wrong, from the health check. */
  warning?: string;
  /** How many previous offers were kept in its place. */
  held?: number;
}

/** Who refused us, and since when, from the last run's status. */
function previousBlocks(): Record<string, string> {
  const prev = readJson<{ results?: StatusResult[] }>(STATUS_OUT, {});
  return Object.fromEntries(
    (prev.results ?? []).filter((r) => r.blockedSince).map((r) => [r.source, r.blockedSince!]),
  );
}

/**
 * What the last run did, per source, for the web app's /beheer and /api/health.
 *
 * The runner already knew which chain failed and why; it only ever said so in
 * the container log, which nobody reads on a quiet day. Four adapters once
 * stopped producing for weeks before anyone noticed. Best-effort like the
 * archive: a status that fails to write must not stop the offers.
 */
function writeStatus(
  results: StatusResult[],
  written: number,
  startedAt: string,
  browserError: string | null,
): void {
  try {
    writeAtomic(
      STATUS_OUT,
      JSON.stringify({
        startedAt,
        finishedAt: new Date().toISOString(),
        written,
        // Without a browser seven chains never even start, so they are absent
        // from `results` rather than failed — this is the only trace of them.
        browserError,
        robotsMode: ROBOTS_MODE,
        results,
      }),
    );
  } catch (e) {
    console.error("[ingest] status write failed:", e);
  }
}

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
    const robots = new RobotsPolicy(fetchRobots, readJson<Record<string, RobotsEntry>>(ROBOTS_CACHE, {}));
    const blocked = previousBlocks();
    for (const module of RETAILER_MODULES) {
      const { source, catalogue: crawl, urls } = module;
      if (!crawl) continue;
      if (blocked[source]) {
        console.log(`[assortment] ${source} overgeslagen: winkel weigerde ons op ${blocked[source]}`);
        continue;
      }
      const reason = await robots.checkAll(urls);
      if (reason && ROBOTS_MODE === "enforce") {
        console.log(`[assortment] ${source} overgeslagen: ${reason}`);
        continue;
      }
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
  const release = acquireLock(LOCK_PATH);
  if (!release) {
    console.log("[ingest] een andere ingest-run is bezig; deze wordt overgeslagen.");
    return;
  }
  try {
    await ingestLocked();
  } finally {
    release();
  }
}

async function ingestLocked(): Promise<void> {
  const nowIso = new Date().toISOString();
  const store = new InMemoryOfferStore();

  // Feed files first: they need no network, so they report even on a day the
  // chains' websites are unreachable.
  let browser: Browser | null = null;
  let browserError: string | null = null;
  if (RETAILER_MODULES.some((m) => m.needs === "browser")) {
    try {
      browser = await launchBrowser();
    } catch (e) {
      console.error("[ingest] browser unavailable, browser-driven chains will report as failed:", e);
      browserError = e instanceof Error ? e.message : String(e);
    }
  }
  const adapters = [
    ...feedAdapters(FEEDS_DIR),
    ...RETAILER_MODULES.map((module) => module.create({ browser })),
  ];

  // robots.txt and recent refusals decide which adapters run at all.
  const robots = new RobotsPolicy(fetchRobots, readJson<Record<string, RobotsEntry>>(ROBOTS_CACHE, {}));
  const blockedBefore = previousBlocks();
  const gate = await gateAdapters(adapters, {
    robots,
    mode: ROBOTS_MODE,
    blockedSince: blockedBefore,
    now: Date.now(),
  });
  try {
    writeAtomic(ROBOTS_CACHE, JSON.stringify(robots.snapshot()));
  } catch (e) {
    console.error("[ingest] robots cache write failed:", e);
  }

  let all;
  let report: IngestionReport;
  try {
    // Three minutes: the polite throttle spaces requests three seconds apart per
    // host, so Dirk's eighteen department calls alone take about a minute.
    report = await runIngestion(gate.adapters, store, { timeoutMs: 180_000 });
    logReport(report);
    all = await store.all();
  } finally {
    if (browser) await browser.close();
  }

  // Only keep offers that are actually valid today (drop next-week/expired).
  const offers = all.filter((o) => isActive(o.validFrom, o.validUntil, nowIso));

  // Health per chain: a failure, a zero or a collapse against the chain's own
  // recent runs keeps its previous offers instead of leaving an empty slot.
  const history = (() => {
    try {
      return parseHistory(readFileSync(COUNTS_OUT, "utf-8"));
    } catch {
      return [] as RunCounts[];
    }
  })();
  const previousOffers = readJson<Offer[]>(OUT, []);
  const health: Record<string, { warning?: string; held?: number }> = {};
  for (const r of report.results) {
    const verdict = r.ok ? assessCount(r.source, r.offerCount, history, nowIso) : { ok: false as const, reason: r.error ?? "mislukt" };
    if (verdict.ok) continue;
    const held = heldOffers(previousOffers, r.source, nowIso);
    // Only replace a suspicious pull when there is something better to show.
    if (r.ok && held.length <= r.offerCount) {
      health[r.source] = { warning: verdict.reason };
    } else {
      if (r.ok) {
        for (let i = offers.length - 1; i >= 0; i -= 1) if (offers[i]!.source === r.source) offers.splice(i, 1);
      }
      offers.push(...held);
      health[r.source] = { warning: verdict.reason, held: held.length };
    }
    console.warn(
      `[health] ${r.source}: ${verdict.reason}` +
        (health[r.source]!.held !== undefined ? ` — ${health[r.source]!.held} eerdere aanbiedingen vastgehouden` : ""),
    );
    const module = RETAILER_MODULES.find((m) => m.source === r.source);
    if (module?.needs === "browser") saveSnapshots(r.source, module.urls, nowIso);
  }
  if (SNAPSHOT_ALL) {
    for (const module of RETAILER_MODULES) if (module.needs === "browser") saveSnapshots(module.source, module.urls, nowIso);
  }
  try {
    const counts = Object.fromEntries(report.results.filter((r) => r.ok).map((r) => [r.source, r.offerCount]));
    appendFileSync(COUNTS_OUT, `${JSON.stringify({ at: nowIso, counts } satisfies RunCounts)}\n`, "utf-8");
  } catch (e) {
    console.error("[ingest] tellingen wegschrijven mislukt:", e);
  }

  const results: StatusResult[] = report.results.map((r) => {
    // Still inside an earlier backoff: keep the original date, or the wait
    // would restart every morning and never end.
    const stillWaiting = r.error?.startsWith("geweigerd door de winkel") ? blockedBefore[r.source] : undefined;
    const refusedNow = !r.ok && !stillWaiting && isBlockError(r.error) ? nowIso : undefined;
    const blockedSince = stillWaiting ?? refusedNow;
    return {
      ...r,
      ...(blockedSince ? { blockedSince } : {}),
      ...(gate.warnings[r.source] ? { robotsWarning: gate.warnings[r.source] } : {}),
      ...(health[r.source] ?? {}),
    };
  });
  writeStatus(results, offers.length, nowIso, browserError);

  if (offers.length === 0) {
    // Never overwrite good data with an empty pull (all sources failed).
    console.error(`[ingest] ${nowIso} no active offers, keeping previous file.`);
    return;
  }

  writeAtomic(OUT, JSON.stringify(offers));
  const heldTotal = Object.values(health).reduce((sum, h) => sum + (h.held ?? 0), 0);
  console.log(
    `[ingest] ${nowIso} wrote ${offers.length} active offers -> ${OUT} ` +
      `(${offers.length - heldTotal} fresh of ${all.length} fetched, ${heldTotal} held from the previous run).`,
  );

  retainArchive(all, nowIso);
  recordPrices(offers, nowIso);
  await notifyIndexNow(previousOffers, offers);
  await crawlCatalogue();
}

/**
 * Announce today's changed pages to IndexNow; see indexnow.ts.
 *
 * Best-effort like the price history: a search engine being unreachable must
 * never cost a day's offers, which are already written by now.
 */
async function notifyIndexNow(previous: Offer[], current: Offer[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key) return;

  const urls = changedUrls(previous, current, {
    site: SITE_URL,
    catalogueChains: new Set(RETAILER_MODULES.filter((m) => m.catalogue).map((m) => m.source)),
  });
  if (urls.length === 0) {
    console.log("[indexnow] niets veranderd, niets ingediend.");
    return;
  }

  try {
    const status = await submitIndexNow(urls, { key, site: SITE_URL });
    // 200 accepted, 202 accepted while the key is being verified.
    const ok = status === 200 || status === 202;
    (ok ? console.log : console.error)(`[indexnow] ${urls.length} URL's ingediend -> HTTP ${status}`);
  } catch (e) {
    console.error("[indexnow] indienen mislukt (aanbiedingen staan er wel):", e);
  }
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
