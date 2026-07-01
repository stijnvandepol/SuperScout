import type { OfferStore, SourceAdapter, SupermarketSlug } from "@superscout/core";

export interface SourceResult {
  source: SupermarketSlug;
  ok: boolean;
  offerCount: number;
  durationMs: number;
  error?: string;
}

export interface IngestionReport {
  results: SourceResult[];
  /** Offers successfully ingested this run (sum over healthy sources). */
  totalOffers: number;
}

export interface RunOptions {
  /** Per-adapter timeout; a slow/hung source is failed, not left to block. */
  timeoutMs?: number;
  /** Injectable clock (ms) for deterministic durations in tests. */
  now?: () => number;
}

/**
 * Run every adapter concurrently with per-source isolation: one source failing
 * or hanging never blocks or fails the others (the circuit-breaker boundary).
 * Successful offers are upserted into the store; a structured report is returned.
 */
export async function runIngestion(
  adapters: SourceAdapter[],
  store: OfferStore,
  options?: RunOptions,
): Promise<IngestionReport> {
  const now = options?.now ?? (() => Date.now());
  const results = await Promise.all(
    adapters.map((adapter) => runOne(adapter, store, now, options?.timeoutMs)),
  );
  const totalOffers = results.reduce((sum, r) => sum + (r.ok ? r.offerCount : 0), 0);
  return { results, totalOffers };
}

async function runOne(
  adapter: SourceAdapter,
  store: OfferStore,
  now: () => number,
  timeoutMs: number | undefined,
): Promise<SourceResult> {
  const start = now();
  try {
    const offers = await withTimeout(adapter.fetchOffers(), timeoutMs);
    await store.upsertMany(offers);
    return { source: adapter.source, ok: true, offerCount: offers.length, durationMs: now() - start };
  } catch (error) {
    return {
      source: adapter.source,
      ok: false,
      offerCount: 0,
      durationMs: now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number | undefined): Promise<T> {
  if (!timeoutMs) return promise;
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Source timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
