import type { Product, ProductStore } from "@superscout/core";
import { AhAssortmentSource } from "./adapters/ah/ah.assortment";
import { AH_AISLES, AH_MEASURED_TOTAL } from "./adapters/ah/ah.taxonomy";

/**
 * Crawl the Albert Heijn catalogue into the product store.
 *
 * Writes aisle by aisle rather than collecting 42.000 products and storing them
 * at the end: a crawl that dies in aisle 19 then leaves 18 aisles updated
 * instead of nothing, and peak memory stays at one aisle rather than the lot.
 *
 * Pruning is the subtle part. Products that vanish from the catalogue must go —
 * a delisted item is a page promising a price the shop no longer offers — but
 * only if the crawl actually succeeded. A partial crawl that pruned would
 * delete every aisle it never reached. So the cutoff is applied once, at the
 * end, and only when every aisle came back.
 */

export interface AssortmentReport {
  source: "ah";
  aisles: number;
  aislesFailed: number;
  products: number;
  pruned: number;
  durationMs: number;
  errors: { aisle: string; error: string }[];
}

export interface AssortmentOptions {
  onProgress?: (line: string) => void;
  /** Injectable for tests. */
  source?: AhAssortmentSource;
  now?: () => number;
}

export async function crawlAhAssortment(
  store: ProductStore,
  options: AssortmentOptions = {},
): Promise<AssortmentReport> {
  const now = options.now ?? (() => Date.now());
  const started = now();
  const startedIso = new Date(started).toISOString();
  const log = options.onProgress ?? (() => {});

  const source =
    options.source ??
    new AhAssortmentSource({
      onProgress: (p) => log(`[assortment] ${p.label}: ${p.fetched}/${p.total}`),
    });

  let products = 0;
  const errors: { aisle: string; error: string }[] = [];

  for (const aisle of AH_AISLES) {
    try {
      const batch: Product[] = await source.fetchTaxonomy(aisle.id, aisle.slug);
      await store.upsertMany(batch);
      products += batch.length;
      log(`[assortment] ${aisle.slug}: ${batch.length} opgeslagen (verwacht ~${aisle.measured})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ aisle: aisle.slug, error: message });
      log(`[assortment] ${aisle.slug} FAALT: ${message}`);
    }
  }

  // Only a complete crawl may prune: a partial one would delete the aisles it
  // never got to.
  let pruned = 0;
  if (errors.length === 0) {
    pruned = await store.pruneStale("ah", startedIso);
    if (pruned > 0) log(`[assortment] ${pruned} verdwenen producten opgeruimd`);
  } else {
    log(`[assortment] niet opgeschoond: ${errors.length} van ${AH_AISLES.length} aisles faalden`);
  }

  const report: AssortmentReport = {
    source: "ah",
    aisles: AH_AISLES.length - errors.length,
    aislesFailed: errors.length,
    products,
    pruned,
    durationMs: now() - started,
    errors,
  };

  log(
    `[assortment] klaar: ${products} producten uit ${report.aisles}/${AH_AISLES.length} aisles ` +
      `in ${(report.durationMs / 1000).toFixed(1)}s (referentie ${AH_MEASURED_TOTAL})`,
  );

  return report;
}
