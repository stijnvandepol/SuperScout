import type { Product } from "@superscout/core";

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

  if (raw.webPath) product.url = `https://www.ah.nl${raw.webPath}`;

  return product;
}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  private get fetcher(): Fetcher {
    return this.options.fetcher ?? ((url, init) => fetch(url, init));
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

  /** Every product in one aisle, following its pages. */
  async fetchTaxonomy(taxonomyId: number, label = ""): Promise<Product[]> {
    const fetchedAt = (this.options.clock ?? (() => new Date().toISOString()))();
    const throttle = this.options.throttleMs ?? THROTTLE_MS;

    const out: Product[] = [];
    const seen = new Set<string>();

    let pageIndex = 0;
    let totalPages = 1;
    let totalElements = 0;

    while (pageIndex < totalPages) {
      const result = await this.page(taxonomyId, pageIndex);
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

    return out;
  }
}
