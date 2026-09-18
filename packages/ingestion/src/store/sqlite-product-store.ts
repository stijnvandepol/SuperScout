import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DIR_FOR_WEB, shareWithWeb, WRITE_FOR_WEB } from "../shared-volume";
import type { Product, ProductQuery, ProductStore, SupermarketSlug } from "@superscout/core";
import { normaliseTitle } from "@superscout/core";

/**
 * SQLite-backed catalogue.
 *
 * Uses Node's built-in `node:sqlite` rather than better-sqlite3 on purpose. The
 * web image is alpine and the ingest image is Playwright's noble; a native
 * module would have to compile against musl in one and glibc in the other,
 * which is exactly the kind of build-time fragility that turns a deploy into an
 * afternoon. The built-in has no install step at all. It is still flagged
 * experimental on Node 22, so both containers pass `--experimental-sqlite`;
 * on Node 24 the flag is a harmless no-op.
 *
 * Writes come from the ingest worker, reads from the web app, over the same
 * file on the shared volume. WAL is what makes that safe: readers never block
 * on the nightly write, and a reader mid-crawl sees the previous consistent
 * state rather than a half-written catalogue.
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id                     TEXT PRIMARY KEY,
  source                 TEXT NOT NULL,
  source_product_id      TEXT NOT NULL,
  title                  TEXT NOT NULL,
  brand                  TEXT,
  sales_unit_size        TEXT,
  price_cents            INTEGER,
  price_before_bonus_cents INTEGER,
  unit_price_cents       INTEGER,
  unit_price_label       TEXT,
  image_url              TEXT,
  category_path          TEXT,
  taxonomy_id            INTEGER,
  url                    TEXT,
  fetched_at             TEXT NOT NULL,
  -- Normalised title, so an offer can find its catalogue entry without a scan.
  -- No chain publishes an EAN and the promotion feed uses different internal
  -- ids than the catalogue, so the normalised name is the only join we have.
  title_key              TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS products_source_pid
  ON products (source, source_product_id);
CREATE INDEX IF NOT EXISTS products_source ON products (source);
-- pruneStale scans by chain and timestamp; without this it is a full table scan
-- per chain per night.
CREATE INDEX IF NOT EXISTS products_source_fetched ON products (source, fetched_at);
CREATE INDEX IF NOT EXISTS products_title ON products (title);
CREATE INDEX IF NOT EXISTS products_title_key ON products (source, title_key);
-- The "same shelf" rail groups by taxonomy where a chain gives one and by
-- category name where it does not; both paths need to stay a lookup.
CREATE INDEX IF NOT EXISTS products_category ON products (source, category_path);
`;

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
  // Optional fields are omitted rather than set to null, so a Product read back
  // out is shaped like one that never went through the database.
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

export class SqliteProductStore implements ProductStore {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    // WAL lets the web app read while the worker writes; NORMAL trades an
    // fsync per commit for one per checkpoint, which is the right side of the
    // trade for data we can simply re-crawl.
    if (path !== ":memory:") {
      this.db.exec("PRAGMA journal_mode = WAL");
      this.db.exec("PRAGMA synchronous = NORMAL");

      // The reader needs write access here, not just read — see
      // WRITE_FOR_WEB for why WAL makes that unavoidable.
      shareWithWeb(dirname(path), DIR_FOR_WEB);
      for (const target of [path, `${path}-wal`, `${path}-shm`]) {
        shareWithWeb(target, WRITE_FOR_WEB);
      }
    }
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec(SCHEMA);
    // CREATE TABLE IF NOT EXISTS leaves an existing table alone, so a database
    // written before title_key existed needs the column added explicitly. The
    // nightly crawl fills it; until then the column is simply null.
    try {
      this.db.exec("ALTER TABLE products ADD COLUMN title_key TEXT");
      this.db.exec("CREATE INDEX IF NOT EXISTS products_title_key ON products (source, title_key)");
    } catch {
      // Already present.
    }
  }

  async upsertMany(products: Product[]): Promise<void> {
    if (products.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO products (
        id, source, source_product_id, title, brand, sales_unit_size,
        price_cents, price_before_bonus_cents, unit_price_cents, unit_price_label,
        image_url, category_path, taxonomy_id, url, fetched_at, title_key
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        brand = excluded.brand,
        sales_unit_size = excluded.sales_unit_size,
        price_cents = excluded.price_cents,
        price_before_bonus_cents = excluded.price_before_bonus_cents,
        unit_price_cents = excluded.unit_price_cents,
        unit_price_label = excluded.unit_price_label,
        image_url = excluded.image_url,
        category_path = excluded.category_path,
        taxonomy_id = excluded.taxonomy_id,
        url = excluded.url,
        fetched_at = excluded.fetched_at,
        title_key = excluded.title_key
    `);

    // One transaction per batch: 42.000 individual commits would take minutes
    // and leave the catalogue half-updated if the crawl dies midway.
    this.db.exec("BEGIN");
    try {
      for (const p of products) {
        stmt.run(
          p.id,
          p.source,
          p.sourceProductId,
          p.title,
          p.brand ?? null,
          p.salesUnitSize ?? null,
          p.priceCents,
          p.priceBeforeBonusCents ?? null,
          p.unitPriceCents ?? null,
          p.unitPriceLabel ?? null,
          p.imageUrl ?? null,
          p.categoryPath ?? null,
          p.taxonomyId ?? null,
          p.url ?? null,
          p.fetchedAt,
          normaliseTitle(p.title) || null,
        );
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async get(id: string): Promise<Product | undefined> {
    const row = this.db.prepare("SELECT * FROM products WHERE id = ?").get(id) as unknown as Row | undefined;
    return row ? toProduct(row) : undefined;
  }

  async bySourceId(
    source: SupermarketSlug,
    sourceProductId: string,
  ): Promise<Product | undefined> {
    const row = this.db
      .prepare("SELECT * FROM products WHERE source = ? AND source_product_id = ?")
      .get(source, sourceProductId) as unknown as Row | undefined;
    return row ? toProduct(row) : undefined;
  }

  async query(q: ProductQuery): Promise<Product[]> {
    const where: string[] = [];
    const args: (string | number)[] = [];

    if (q.source) {
      where.push("source = ?");
      args.push(q.source);
    }
    if (q.search?.trim()) {
      where.push("(title LIKE ? OR brand LIKE ?)");
      // LIKE with a leading wildcard cannot use the index; acceptable while
      // this backs internal lookups rather than the public search box.
      const needle = `%${q.search.trim()}%`;
      args.push(needle, needle);
    }

    const sql =
      "SELECT * FROM products" +
      (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
      " ORDER BY title LIMIT ? OFFSET ?";
    args.push(q.limit ?? 100, q.offset ?? 0);

    return (this.db.prepare(sql).all(...args) as unknown as Row[]).map(toProduct);
  }

  async count(source?: SupermarketSlug): Promise<number> {
    const row = source
      ? this.db.prepare("SELECT COUNT(*) AS n FROM products WHERE source = ?").get(source)
      : this.db.prepare("SELECT COUNT(*) AS n FROM products").get();
    return Number((row as { n: number }).n);
  }

  async pruneStale(source: SupermarketSlug, seenBefore: string): Promise<number> {
    const before = this.db
      .prepare("SELECT COUNT(*) AS n FROM products WHERE source = ? AND fetched_at < ?")
      .get(source, seenBefore) as { n: number };

    this.db
      .prepare("DELETE FROM products WHERE source = ? AND fetched_at < ?")
      .run(source, seenBefore);

    return Number(before.n);
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
