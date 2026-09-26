import type { Product } from "@superscout/core";
import { isBlockError, stopOnRefusal } from "../../gate";

/**
 * Albert Heijn's full catalogue — 42.354 products, against 242 promotions.
 *
 * The promotion feed can only ever describe what is discounted this week, which
 * caps the site at roughly a thousand pages that all expire. The catalogue is
 * what the shop actually sells, so a product page built from it is permanent
 * and answers a question the promotion feed cannot: "wat kost dit bij AH".
 *
 * Two things about this API are worth knowing before changing anything here.
 *
 * Introspection is disabled (`INTROSPECTION_DISABLED`) and so are field
 * suggestions, so the schema below was recovered by probing: a wrong field name
 * yields "Cannot query field X", a right one yields data or "must have a
 * selection of subfields". Adding a field means probing for it the same way.
 *
 * And an empty query reports `totalElements: 10000` whatever you ask, because
 * that is Elasticsearch's result-window cap rather than a real count. So the
 * crawl walks the taxonomy instead: the 25 top-level aisles each hold 400-3.700
 * products, comfortably under the cap, and their ids come from AH's own
 * category sitemap.
 */

const TOKEN_URL = "https://api.ah.nl/mobile-auth/v1/auth/token/anonymous";
const GRAPHQL_URL = "https://api.ah.nl/graphql";
const UA = "Appie/8.22.3 Model/phone Android/13-API33";

/** Page size. AH accepts larger, but this keeps a retry cheap. */
const PAGE_SIZE = 100;

/** Courtesy delay between requests; a full crawl is ~425 of them. */
const THROTTLE_MS = 250;

/**
 * Attempts per page before giving up on it.
 *
 * Kept for genuinely transient failures, but note what it does *not* fix. AH's
 * gateway answers "Subgraph errors redacted" past offset 3.000 within a
 * taxonomy — a second result-window cap alongside the 10.000 one on an
 * unfiltered query. Retrying was measured against it and every attempt failed
 * identically, because it is a limit rather than load: on a full crawl the four
 * aisles above 3.000 products each stopped at exactly 3.000.
 *
 * The consequence is that those four aisles lose their tail — roughly 1.500
 * products of 42.000, about 3.5%. Recovering them means crawling their
 * sub-categories, which AH's sitemap lists but does not map to parents.
 */
const PAGE_ATTEMPTS = 3;

/** Backoff between attempts. */
const RETRY_MS = 1500;

const PRODUCT_QUERY = `
query assortment($input: ProductSearchInput!) {
  productSearch(input: $input) {
    page { totalElements totalPages }
    products {
      id
      title
      brand
      salesUnitSize
      webPath
      category
      price { now { amount } was { amount } unitInfo { price { amount } description } }
      imagePack { medium { url } }
      taxonomies { id name slug }
    }
  }
}`;

export interface AhRawProduct {
  id: number;
  title: string;
  brand?: string | null;
  salesUnitSize?: string | null;
  webPath?: string | null;
  category?: string | null;
  price?: {
    now?: { amount?: number | null } | null;
    was?: { amount?: number | null } | null;
    unitInfo?: {
      price?: { amount?: number | null } | null;
      description?: string | null;
    } | null;
  } | null;
  taxonomies?: { id: number; name: string; slug: string }[] | null;
  /** A list, one entry per rendition set; we take the first medium. */
  imagePack?: { medium?: { url?: string | null } | null }[] | null;
}

/** Euro amount (7.16) to integer cents, or null when absent or nonsensical. */
export function amountToCents(amount: number | null | undefined): number | null {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

/**
 * Map one catalogue entry to a Product.
 *
 * `price.was` is only populated while something is discounted, so it is kept as
 * a promotion signal rather than treated as history — the real history is
 * accumulated separately, day by day.
 */
export function normalizeAhProduct(
  raw: AhRawProduct,
  taxonomyId: number,
  fetchedAt: string,
): Product | null {
  const sourceProductId = String(raw.id ?? "").trim();
  const title = (raw.title ?? "").trim();
  if (!sourceProductId || !title) return null;

  const product: Product = {
    id: `ah:${sourceProductId}`,
    source: "ah",
    sourceProductId,
    title,
    priceCents: amountToCents(raw.price?.now?.amount),
    taxonomyId,
    fetchedAt,
  };

  const brand = raw.brand?.trim();
  if (brand) product.brand = brand;

  const unit = raw.salesUnitSize?.trim();
  if (unit) product.salesUnitSize = unit;

  const was = amountToCents(raw.price?.was?.amount);
  // Equal prices mean nothing is discounted; recording that as a "before" price
  // would invent a promotion.
  if (was !== null && was !== product.priceCents) product.priceBeforeBonusCents = was;

  const unitPrice = amountToCents(raw.price?.unitInfo?.price?.amount);
  if (unitPrice !== null) product.unitPriceCents = unitPrice;
  const unitLabel = raw.price?.unitInfo?.description?.trim();
  if (unitLabel) product.unitPriceLabel = unitLabel;

  const category = raw.category?.trim();
  if (category) product.categoryPath = category;

  // 400x400 WEBP: large enough for the product page, small enough that 22.000
  // of them do not sink the listing pages that show them in a grid.
  const image = raw.imagePack?.[0]?.medium?.url;
  if (image) product.imageUrl = image;

  if (raw.webPath) product.url = `https://www.ah.nl${raw.webPath}`;

  return product;
}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface TaxonomyResult {
  products: Product[];
  /**
   * Whether every page of the aisle came back.
   *
   * False is the normal state for the four aisles above AH's 3.000-per-taxonomy
   * cap, not an exception. Keeping the partial result raised a full crawl from
   * 28.911 products to 40.911; the caller still has to know, because pruning
   * against an incomplete crawl would delete the rest of the catalogue.
   */
  complete: boolean;
}

export interface CrawlProgress {
  taxonomyId: number;
  label: string;
  fetched: number;
  total: number;
}

export interface AhAssortmentOptions {
  /** Injectable for tests; defaults to global fetch. */
  fetcher?: Fetcher;
  clock?: () => string;
  /** Called after each page, so a long crawl is observable while it runs. */
  onProgress?: (p: CrawlProgress) => void;
  throttleMs?: number;
}

/**
 * Crawl the catalogue, one aisle at a time.
 *
 * Yields per taxonomy rather than returning everything, so the caller can write
 * each aisle to storage as it lands. A crawl that dies in aisle 19 then leaves
 * 18 aisles updated instead of nothing.
 */
export class AhAssortmentSource {
  readonly source = "ah" as const;

  private token: string | null = null;

  constructor(private readonly options: AhAssortmentOptions = {}) {}

  private readonly refusal = { refused: null as number | null };
  private guarded: Fetcher | undefined;

  private get fetcher(): Fetcher {
    // Wrapped once per source instance, so one refusal stops the whole crawl.
    this.guarded ??= stopOnRefusal(this.options.fetcher ?? ((url, init) => fetch(url, init)), this.refusal);
    return this.guarded;
  }

  private async authorise(): Promise<string> {
    if (this.token) return this.token;

    const res = await this.fetcher(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": UA },
      body: JSON.stringify({ clientId: "appie" }),
    });
    if (!res.ok) throw new Error(`AH auth responded ${res.status}`);

    const body = (await res.json()) as { access_token?: string };
    if (!body.access_token) throw new Error("AH auth returned no access_token");

    this.token = body.access_token;
    return this.token;
  }

  private async page(
    taxonomyId: number,
    page: number,
  ): Promise<{ products: AhRawProduct[]; totalElements: number; totalPages: number }> {
    const token = await this.authorise();

    const res = await this.fetcher(GRAPHQL_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        "user-agent": UA,
      },
      body: JSON.stringify({
        query: PRODUCT_QUERY,
        variables: { input: { query: "", taxonomyId, size: PAGE_SIZE, page } },
      }),
    });
    if (!res.ok) throw new Error(`AH graphql responded ${res.status}`);

    const body = (await res.json()) as {
      data?: { productSearch?: { page?: { totalElements?: number; totalPages?: number }; products?: AhRawProduct[] } };
      errors?: { message: string }[];
    };
    if (body.errors?.length) throw new Error(`AH graphql: ${body.errors[0]!.message}`);

    const result = body.data?.productSearch;
    return {
      products: result?.products ?? [],
      totalElements: result?.page?.totalElements ?? 0,
      totalPages: result?.page?.totalPages ?? 0,
    };
  }

  /** One page, retried a few times before it counts as failed. */
  private async pageWithRetry(
    taxonomyId: number,
    page: number,
  ): Promise<{ products: AhRawProduct[]; totalElements: number; totalPages: number }> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= PAGE_ATTEMPTS; attempt += 1) {
      try {
        return await this.page(taxonomyId, page);
      } catch (error) {
        lastError = error;
        // A refusal is an answer, not a hiccup: do not ask again.
        if (isBlockError(error instanceof Error ? error.message : String(error))) break;
        if (attempt < PAGE_ATTEMPTS) await sleep(RETRY_MS * attempt);
      }
    }
    throw lastError;
  }

  /** Every product in one aisle, following its pages. */
  async fetchTaxonomy(taxonomyId: number, label = ""): Promise<TaxonomyResult> {
    const fetchedAt = (this.options.clock ?? (() => new Date().toISOString()))();
    const throttle = this.options.throttleMs ?? THROTTLE_MS;

    const out: Product[] = [];
    const seen = new Set<string>();

    let pageIndex = 0;
    let totalPages = 1;
    let totalElements = 0;

    while (pageIndex < totalPages) {
      let result;
      try {
        result = await this.pageWithRetry(taxonomyId, pageIndex);
      } catch {
        // Keep what the aisle already gave us and tell the caller it is partial.
        return { products: out, complete: false };
      }
      totalPages = result.totalPages;
      totalElements = result.totalElements;

      for (const raw of result.products) {
        const product = normalizeAhProduct(raw, taxonomyId, fetchedAt);
        // A product can sit in several sub-aisles of the same top-level one.
        if (!product || seen.has(product.id)) continue;
        seen.add(product.id);
        out.push(product);
      }

      this.options.onProgress?.({
        taxonomyId,
        label,
        fetched: out.length,
        total: totalElements,
      });

      pageIndex += 1;
      if (pageIndex < totalPages && throttle > 0) await sleep(throttle);
    }

    return { products: out, complete: true };
  }
}
