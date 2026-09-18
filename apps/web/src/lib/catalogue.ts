import { DatabaseSync } from "node:sqlite";
import type { Product, SupermarketSlug } from "@superscout/core";

/**
 * Read side of the product catalogue.
 *
 * The ingest worker owns writing; the web app only ever reads, so this is a
 * deliberately small read-only accessor rather than an import from the
 * ingestion package — the dependency runs one way, and a web route has no
 * business being able to prune the catalogue.
 *
 * It also cannot live in `@superscout/core`: that package is imported by client
 * components, and pulling `node:sqlite` into the browser bundle would fail the
 * build. Same reasoning as `lib/offers.ts` reaching for `node:fs` directly.
 *
 * The connection is opened once and kept. SQLite in WAL mode handles a
 * long-lived reader against a writing worker fine, and reopening the file per
 * request would cost more than it saves.
 */

/**
 * URLs per sitemap chunk.
 *
 * A sitemap file may hold 50.000. Albert Heijn alone is 42.354, so one file
 * fits today and would not once Jumbo lands — and finding that out by having
 * Google reject the file is a poor way to learn it.
 */
export const SITEMAP_CHUNK_SIZE = 20_000;

let db: DatabaseSync | null = null;
let failed = false;

function connect(): DatabaseSync | null {
  if (db) return db;
  // One failed open is enough; retrying per request would turn a missing file
  // into a slow site rather than a fast one without a catalogue.
  if (failed) return null;

  const path = process.env.CATALOGUE_DB;
  if (!path) return null;

  try {
    // Read-only: a bug in a page must never be able to write to the catalogue.
    db = new DatabaseSync(path, { readOnly: true });
    return db;
  } catch {
    failed = true;
    return null;
  }
}

interface Row {
  id: string;
  source: string;
  source_product_id: string;
  title: string;
  brand: string | null;
  sales_unit_size: string | null;
  price_cents: number | null;
  price_before_bonus_cents: number | null;
  unit_price_cents: number | null;
  unit_price_label: string | null;
  image_url: string | null;
  category_path: string | null;
  taxonomy_id: number | null;
  url: string | null;
  fetched_at: string;
}

function toProduct(row: Row): Product {
  const product: Product = {
    id: row.id,
    source: row.source as SupermarketSlug,
    sourceProductId: row.source_product_id,
    title: row.title,
    priceCents: row.price_cents,
    fetchedAt: row.fetched_at,
  };
  if (row.brand !== null) product.brand = row.brand;
  if (row.sales_unit_size !== null) product.salesUnitSize = row.sales_unit_size;
  if (row.price_before_bonus_cents !== null)
    product.priceBeforeBonusCents = row.price_before_bonus_cents;
  if (row.unit_price_cents !== null) product.unitPriceCents = row.unit_price_cents;
  if (row.unit_price_label !== null) product.unitPriceLabel = row.unit_price_label;
  if (row.image_url !== null) product.imageUrl = row.image_url;
  if (row.category_path !== null) product.categoryPath = row.category_path;
  if (row.taxonomy_id !== null) product.taxonomyId = row.taxonomy_id;
  if (row.url !== null) product.url = row.url;
  return product;
}

/** One product by chain and the chain's own id, or undefined. */
export function getProduct(
  chain: SupermarketSlug,
  sourceProductId: string,
): Product | undefined {
  const handle = connect();
  if (!handle) return undefined;

  try {
    const row = handle
      .prepare("SELECT * FROM products WHERE source = ? AND source_product_id = ?")
      .get(chain, sourceProductId) as unknown as Row | undefined;
    return row ? toProduct(row) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Other products from the same aisle, for the "meer uit dit schap" rail.
 *
 * A product page carrying only a title and a price is the thin content that
 * gets a 40.000-page section ignored wholesale. Neighbours give every page
 * something of its own and turn the catalogue into a browsable graph rather
 * than 40.000 dead ends.
 */
export function neighbours(product: Product, limit = 8): Product[] {
  const handle = connect();
  if (!handle || product.taxonomyId === undefined) return [];

  try {
    const rows = handle
      .prepare(
        `SELECT * FROM products
         WHERE source = ? AND taxonomy_id = ? AND id != ? AND price_cents IS NOT NULL
         ORDER BY title LIMIT ?`,
      )
      .all(product.source, product.taxonomyId, product.id, limit) as unknown as Row[];
    return rows.map(toProduct);
  } catch {
    return [];
  }
}

/** How many products the catalogue holds, overall or for one chain. */
export function catalogueSize(chain?: SupermarketSlug): number {
  const handle = connect();
  if (!handle) return 0;

  try {
    const row = chain
      ? handle.prepare("SELECT COUNT(*) AS n FROM products WHERE source = ?").get(chain)
      : handle.prepare("SELECT COUNT(*) AS n FROM products").get();
    return Number((row as { n: number } | undefined)?.n ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Every product id for a chain, for the sitemap.
 *
 * Returns ids and titles only: pulling 42.000 full rows to build a URL list
 * would read far more than the sitemap needs.
 */
export function productIndex(
  chain: SupermarketSlug,
  limit: number,
  offset: number,
): { sourceProductId: string; title: string; fetchedAt: string }[] {
  const handle = connect();
  if (!handle) return [];

  try {
    return handle
      .prepare(
        `SELECT source_product_id, title, fetched_at FROM products
         WHERE source = ? ORDER BY source_product_id LIMIT ? OFFSET ?`,
      )
      .all(chain, limit, offset)
      .map((row) => {
        const r = row as unknown as {
          source_product_id: string;
          title: string;
          fetched_at: string;
        };
        return {
          sourceProductId: r.source_product_id,
          title: r.title,
          fetchedAt: r.fetched_at,
        };
      });
  } catch {
    return [];
  }
}
