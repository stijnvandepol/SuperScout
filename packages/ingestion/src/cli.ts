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
import { InMemoryOfferStore, isActive } from "@superscout/core";
import { runIngestion } from "./runner";
import { liveAdapters } from "./sources";

const OUT = process.env.OFFERS_OUT ?? "/data/offers.json";
const INGEST_HOUR = Number(process.env.INGEST_HOUR ?? 5);

async function ingestOnce(): Promise<void> {
  const nowIso = new Date().toISOString();
  const store = new InMemoryOfferStore();
  const report = await runIngestion(liveAdapters(), store, { timeoutMs: 30_000 });

  // Only keep offers that are actually valid today (drop next-week/expired).
  const all = await store.all();
  const offers = all.filter((o) => isActive(o.validFrom, o.validUntil, nowIso));

  const summary = report.results
    .map((r) => `${r.source}=${r.ok ? r.offerCount : `FAIL(${r.error ?? "?"})`}`)
    .join(" ");

  if (offers.length === 0) {
    // Never overwrite good data with an empty pull (all sources failed).
    console.error(`[ingest] ${nowIso} no active offers, keeping previous file. ${summary}`);
    return;
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(offers), "utf-8");
  console.log(
    `[ingest] ${nowIso} wrote ${offers.length}/${all.length} active offers -> ${OUT}. ${summary}`,
  );
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
