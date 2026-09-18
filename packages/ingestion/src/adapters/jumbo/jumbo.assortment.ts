import type { Product } from "@superscout/core";

/**
 * Jumbo's catalogue.
 *
 * Their GraphQL is friendlier than AH's in one way and more awkward in another.
 * Friendlier: `categories` returns the whole taxonomy — 2.486 entries — so
 * unlike AH there is no sitemap to scrape for ids. Awkward: `searchProducts`
 * takes `searchType: CATEGORY`, but every form of category reference we tried
 * returned a NullPointerException from their Bloomreach backend, so the
 * category-scoped path stays out of reach.
 *
 * What does work is `searchType: KEYWORD` with paging, so the crawl searches
 * each category by *name* and unions the results. That is relevance search
 * rather than a category listing, which means coverage is very good but not
 * provably complete — measured over a 25-category sample it returned 780
 * distinct SKUs against 847 reported hits, so overlap is modest and the union
 * converges on the catalogue.
 *
 * Being honest about that matters: if a Jumbo product is missing, this is why,
 * and the fix is finding the CATEGORY invocation rather than adding search
 * terms.
 */

const GRAPHQL_URL = "https://www.jumbo.com/api/graphql";

/** Jumbo rejects the query with "No client headers set" without these. */
const HEADERS = {
  "content-type": "application/json",
  accept: "*/*",
  "apollographql-client-name": "JUMBO_MOBILE-promotion",
  "apollographql-client-version": "33.10.0",
  "x-source": "JUMBO_MOBILE-promotion",
  origin: "capacitor://jumbo",
  "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15",
} as const;

const PAGE_SIZE = 100;

/**
 * How deep to follow one category's results.
 *
 * Relevance search degrades the further you page: past a few hundred hits the
 * results stop being about the term at all, so fetching more costs requests and
 * adds noise rather than coverage.
 */
const MAX_PER_CATEGORY = 500;

const THROTTLE_MS = 200;

const CATEGORIES_QUERY = `{ categories { id name } }`;

const SEARCH_QUERY = `
query assortment($input: ProductSearchInput!) {
  searchProducts(input: $input) {
    count
    start
    products {
      sku
      title
      brand
      subtitle
      image
      link
      category
      inAssortment
      price { price promoPrice pricePerUnit { price unit } }
    }
  }
}`;

export interface JumboRawProduct {
  sku?: string | null;
  title?: string | null;
  brand?: string | null;
  /** The package, e.g. "400 g". */
  subtitle?: string | null;
  image?: string | null;
  link?: string | null;
  category?: string | null;
  inAssortment?: boolean | null;
  price?: {
    price?: number | null;
    promoPrice?: number | null;
    /** Comparable unit price, already in cents, e.g. 1899 per "kg". */
    pricePerUnit?: { price?: number | null; unit?: string | null } | null;
  } | null;
}

export interface JumboCategory {
  id: string;
  name: string;
}

/** Jumbo quotes prices in integer cents already — no conversion, just guarding. */
export function centsOf(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

export function normalizeJumboProduct(raw: JumboRawProduct, fetchedAt: string): Product | null {
  const sku = (raw.sku ?? "").trim();
  const title = (raw.title ?? "").trim();
  if (!sku || !title) return null;

  const price = centsOf(raw.price?.price);
  const promo = centsOf(raw.price?.promoPrice);

  const product: Product = {
    id: `jumbo:${sku}`,
    source: "jumbo",
    sourceProductId: sku,
    title,
    // When something is on promotion the shelf price is the promo one, and the
    // regular price becomes the "before" figure — the opposite of AH's shape.
    priceCents: promo ?? price,
    fetchedAt,
  };

  if (promo !== null && price !== null && price !== promo) product.priceBeforeBonusCents = price;

  const brand = raw.brand?.trim();
  // Jumbo writes "Neutraal (merkloos)" for unbranded items; recording that as a
  // brand would put it on the page as if it were one.
  if (brand && !/^neutraal/i.test(brand)) product.brand = brand;

  const unit = raw.subtitle?.trim();
  if (unit) product.salesUnitSize = unit;

  const unitPrice = centsOf(raw.price?.pricePerUnit?.price);
  if (unitPrice !== null) product.unitPriceCents = unitPrice;
  const unitLabel = raw.price?.pricePerUnit?.unit?.trim();
  if (unitLabel) product.unitPriceLabel = unitLabel;

  const category = raw.category?.trim();
  if (category) product.categoryPath = category;

  if (raw.image) product.imageUrl = raw.image;
  if (raw.link) product.url = `https://www.jumbo.com${raw.link}`;

  return product;
}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface JumboAssortmentOptions {
  fetcher?: Fetcher;
  clock?: () => string;
  onProgress?: (p: { label: string; fetched: number; total: number }) => void;
  throttleMs?: number;
  maxPerCategory?: number;
}

export class JumboAssortmentSource {
  readonly source = "jumbo" as const;

  constructor(private readonly options: JumboAssortmentOptions = {}) {}

  private get fetcher(): Fetcher {
    return this.options.fetcher ?? ((url, init) => fetch(url, init));
  }

  private async gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await this.fetcher(GRAPHQL_URL, {
      method: "POST",
      headers: { ...HEADERS },
      body: JSON.stringify(variables ? { query, variables } : { query }),
    });
    if (!res.ok) throw new Error(`Jumbo responded ${res.status}`);

    const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (body.errors?.length) throw new Error(`Jumbo graphql: ${body.errors[0]!.message}`);
    if (!body.data) throw new Error("Jumbo graphql returned no data");
    return body.data;
  }

  /** The taxonomy, minus the synthetic root. */
  async categories(): Promise<JumboCategory[]> {
    const data = await this.gql<{ categories?: JumboCategory[] }>(CATEGORIES_QUERY);
    return (data.categories ?? []).filter((c) => c.name && c.name !== "PRODUCTEN");
  }

  /**
   * Search terms for one category.
   *
   * A comma in a category name defeats the relevance search: "Handzeep,
   * handcreme" returns nothing while "Handzeep" alone returns 43 products. So a
   * compound name is split and each part searched, then unioned.
   */
  static searchTerms(name: string): string[] {
    const parts = name
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length >= 3);
    return parts.length > 0 ? parts : [name.trim()];
  }

  /** Every product a category surfaces, following the result pages. */
  async fetchCategory(name: string): Promise<Product[]> {
    const out: Product[] = [];
    const seen = new Set<string>();

    for (const term of JumboAssortmentSource.searchTerms(name)) {
      for (const product of await this.search(term)) {
        if (seen.has(product.id)) continue;
        seen.add(product.id);
        out.push(product);
      }
    }
    return out;
  }

  /** One search term, paged. */
  private async search(name: string): Promise<Product[]> {
    const fetchedAt = (this.options.clock ?? (() => new Date().toISOString()))();
    const throttle = this.options.throttleMs ?? THROTTLE_MS;
    const cap = this.options.maxPerCategory ?? MAX_PER_CATEGORY;

    const out: Product[] = [];
    const seen = new Set<string>();
    let total = 0;

    for (let offset = 0; offset === 0 || offset < Math.min(total, cap); offset += PAGE_SIZE) {
      const data = await this.gql<{
        searchProducts?: { count?: number; products?: JumboRawProduct[] };
      }>(SEARCH_QUERY, {
        input: { searchType: "KEYWORD", searchTerms: name, offSet: offset, limit: PAGE_SIZE },
      });

      const result = data.searchProducts;
      total = result?.count ?? 0;

      const batch = result?.products ?? [];
      for (const raw of batch) {
        // Delisted items still surface in search; a page for something the shop
        // does not carry is a page promising a price nobody can pay.
        if (raw.inAssortment === false) continue;

        const product = normalizeJumboProduct(raw, fetchedAt);
        if (!product || seen.has(product.id)) continue;
        seen.add(product.id);
        out.push(product);
      }

      this.options.onProgress?.({ label: name, fetched: out.length, total });

      // A short page means the result set is exhausted regardless of `count`.
      if (batch.length < PAGE_SIZE) break;
      if (throttle > 0) await sleep(throttle);
    }

    return out;
  }
}
