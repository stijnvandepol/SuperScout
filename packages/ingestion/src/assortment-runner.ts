import type { Product, ProductStore } from "@superscout/core";
import { AhAssortmentSource } from "./adapters/ah/ah.assortment";
import { AH_AISLES, AH_MEASURED_TOTAL } from "./adapters/ah/ah.taxonomy";
import { JumboAssortmentSource } from "./adapters/jumbo/jumbo.assortment";

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
  source: "ah" | "jumbo";
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


export interface JumboAssortmentOptions {
  onProgress?: (line: string) => void;
  source?: JumboAssortmentSource;
  now?: () => number;
  /** Cap the category list, for a smoke run rather than the full 2.485. */
  limit?: number;
}

/**
 * Crawl the Jumbo catalogue into the product store.
 *
 * Same shape as the Albert Heijn pass — write per category, prune only after a
 * complete run — but the unit of work is a category *name* searched as a
 * keyword rather than an aisle id, because Jumbo's category-scoped search
 * refuses every form of reference we tried. See jumbo.assortment.ts.
 *
 * With 2.485 categories this is the long one: roughly a quarter of an hour.
 */
export async function crawlJumboAssortment(
  store: ProductStore,
  options: JumboAssortmentOptions = {},
): Promise<AssortmentReport> {
  const now = options.now ?? (() => Date.now());
  const started = now();
  const startedIso = new Date(started).toISOString();
  const log = options.onProgress ?? (() => {});

  const source = options.source ?? new JumboAssortmentSource();

  let categories: { id: string; name: string }[];
  try {
    categories = await source.categories();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`[assortment] jumbo: taxonomie ophalen faalde: ${message}`);
    return {
      source: "jumbo",
      aisles: 0,
      aislesFailed: 1,
      products: 0,
      pruned: 0,
      durationMs: now() - started,
      errors: [{ aisle: "categories", error: message }],
    };
  }

  const work = options.limit ? categories.slice(0, options.limit) : categories;
  let products = 0;
  const errors: { aisle: string; error: string }[] = [];

  for (const category of work) {
    try {
      const batch: Product[] = await source.fetchCategory(category.name);
      await store.upsertMany(batch);
      products += batch.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ aisle: category.name, error: message });
    }
  }

  // Same rule as AH: a partial crawl must never prune, or it deletes every
  // category it never reached.
  let pruned = 0;
  if (errors.length === 0 && !options.limit) {
    pruned = await store.pruneStale("jumbo", startedIso);
    if (pruned > 0) log(`[assortment] jumbo: ${pruned} verdwenen producten opgeruimd`);
  }

  const report: AssortmentReport = {
    source: "jumbo",
    aisles: work.length - errors.length,
    aislesFailed: errors.length,
    products,
    pruned,
    durationMs: now() - started,
    errors,
  };

  log(
    `[assortment] jumbo klaar: ${products} producten uit ${report.aisles}/${work.length} categorieën ` +
      `in ${(report.durationMs / 1000).toFixed(1)}s`,
  );

  return report;
}
