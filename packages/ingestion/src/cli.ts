/**
 * Live ingestion worker. Runs the source adapters (Dirk + Jumbo — no auth) and
 * writes normalized offers to a JSON file the web app reads at runtime.
 *
 * Env:
 *   OFFERS_OUT           output path (default /data/offers.json)
 *   INGEST_INTERVAL_MS   loop interval (default 6h); set INGEST_ONCE=1 to run once
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { InMemoryOfferStore } from "@superscout/core";
import { runIngestion } from "./runner";
import { liveAdapters } from "./sources";

const OUT = process.env.OFFERS_OUT ?? "/data/offers.json";
// Default: once a day.
const INTERVAL_MS = Number(process.env.INGEST_INTERVAL_MS ?? 24 * 60 * 60 * 1000);

async function ingestOnce(): Promise<void> {
  const store = new InMemoryOfferStore();
  const report = await runIngestion(liveAdapters(), store, { timeoutMs: 30_000 });
  const offers = await store.all();

  const summary = report.results
    .map((r) => `${r.source}=${r.ok ? r.offerCount : `FAIL(${r.error ?? "?"})`}`)
    .join(" ");

  if (offers.length === 0) {
    // Never overwrite good data with an empty pull (all sources failed).
    console.error(`[ingest] ${stamp()} no offers fetched, keeping previous file. ${summary}`);
    return;
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(offers), "utf-8");
  console.log(`[ingest] ${stamp()} wrote ${offers.length} offers -> ${OUT}. ${summary}`);
}

function stamp(): string {
  return new Date().toISOString();
}

async function main(): Promise<void> {
  await ingestOnce().catch((e) => console.error("[ingest] run failed", e));
  if (process.env.INGEST_ONCE === "1") return;
  setInterval(() => {
    void ingestOnce().catch((e) => console.error("[ingest] run failed", e));
  }, INTERVAL_MS);
  console.log(`[ingest] scheduled every ${Math.round(INTERVAL_MS / 60000)} min`);
}

void main();
