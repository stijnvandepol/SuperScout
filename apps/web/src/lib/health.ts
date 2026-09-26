import { readFileSync } from "node:fs";
import { INGESTED_SUPERMARKETS } from "@superscout/core";
import { dataFetchedAt, getOffers } from "@/lib/offers";

/**
 * Is the site telling the truth today?
 *
 * "Up" is not the question for a price comparison — the container answered
 * 200 for weeks while four chains were silently missing and, another time,
 * while it served July's prices. So health means: offers exist, they are
 * recent, and the chains we ingest are producing. That is what an uptime
 * monitor should page on.
 */

export interface IngestStatus {
  startedAt: string;
  finishedAt: string;
  written: number;
  browserError: string | null;
  results: { source: string; ok: boolean; offerCount: number; durationMs: number; error?: string }[];
}

/** Data older than this means the daily ingest missed at least one run. */
export const MAX_DATA_AGE_HOURS = 36;

export function readIngestStatus(): IngestStatus | null {
  const path = process.env.INGEST_STATUS_PATH;
  if (!path) return null;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as IngestStatus;
  } catch {
    return null;
  }
}

export interface Health {
  ok: boolean;
  offers: number;
  chains: number;
  dataAgeHours: number | null;
  missingChains: string[];
  failingSources: string[];
  lastRun: string | null;
  problems: string[];
}

export function health(now = Date.now()): Health {
  const offers = getOffers();
  const newest = dataFetchedAt();
  const dataAgeHours = newest ? Math.round(((now - Date.parse(newest)) / 3_600_000) * 10) / 10 : null;
  const live = new Set(offers.map((o) => o.source));
  const missingChains = INGESTED_SUPERMARKETS.filter((s) => !live.has(s));
  const status = readIngestStatus();
  const failingSources = status?.results.filter((r) => !r.ok || r.offerCount === 0).map((r) => r.source) ?? [];

  const problems: string[] = [];
  if (offers.length === 0) problems.push("geen aanbiedingen");
  if (dataAgeHours !== null && dataAgeHours > MAX_DATA_AGE_HOURS) {
    problems.push(`data is ${dataAgeHours} uur oud`);
  }
  // Losing a single chain is worth a look on /beheer, not a page at 3 a.m.;
  // losing half of them means the ingest itself is broken.
  if (missingChains.length > INGESTED_SUPERMARKETS.length / 2) {
    problems.push(`${missingChains.length} ketens zonder aanbiedingen`);
  }
  if (status?.browserError) problems.push("browser voor ingest start niet");

  return {
    ok: problems.length === 0,
    offers: offers.length,
    chains: live.size,
    dataAgeHours,
    missingChains,
    failingSources,
    lastRun: status?.finishedAt ?? null,
    problems,
  };
}
