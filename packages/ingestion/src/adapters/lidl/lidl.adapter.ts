import type { Browser } from "playwright";
import type { Offer, SourceAdapter, SupermarketSlug } from "@superscout/core";
import { scrapePage } from "../../browser/intercept";
import type { LidlRawOffer } from "./lidl.raw";
import { normalizeLidlOffer } from "./lidl.normalize";

const LIDL_OFFERS_URL = "https://www.lidl.nl/c/aanbiedingen/a10008785";

/**
 * Runs INSIDE the page (Playwright page.evaluate) — must be self-contained, no
 * imports. Reads Lidl's rendered offer tiles: sale price from `.ods-price__value`
 * (the dedicated element, so we never pick up a base/per-unit price), the
 * discount badge, the strikethrough reference price, and the validity badge.
 */
function extractLidlOffers(): LidlRawOffer[] {
  const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
  const tiles = Array.from(document.querySelectorAll(".product-grid-box"));
  const out: LidlRawOffer[] = [];

  for (const tile of tiles) {
    const currentPrice = clean(tile.querySelector(".ods-price__value")?.textContent);
    if (!/\d/.test(currentPrice)) continue;

    const link = tile.querySelector("a[href*='/p/']") ?? tile.querySelector("a");
    const href = link?.getAttribute("href") ?? "";
    const id = href.match(/(p\d+)/)?.[1] ?? href;

    let discount: string | undefined;
    let oldPrice: string | undefined;
    for (const el of Array.from(tile.querySelectorAll("*"))) {
      if (el.children.length !== 0) continue;
      const t = clean(el.textContent);
      if (!discount && /^-\d+%$/.test(t)) discount = t;
      if (!oldPrice && /^\d+[.,]\d{2}$/.test(t) && t !== currentPrice) oldPrice = t;
    }

    let title = clean(link?.getAttribute("title"));
    if (!title) title = clean((link?.textContent ?? "").split(/\svoor\s/)[0]);

    out.push({
      id,
      title,
      description: clean(tile.querySelector(".product-grid-box__desc")?.textContent) || undefined,
      currentPrice,
      oldPrice,
      discount,
      badge: clean(tile.querySelector(".ods-badge__label")?.textContent) || undefined,
      url: href || undefined,
      image: tile.querySelector("img")?.getAttribute("src") ?? undefined,
    });
  }
  return out;
}

/** Lidl: server-rendered offers page, scraped through a headless browser. */
export class LidlAdapter implements SourceAdapter {
  readonly source: SupermarketSlug = "lidl";

  constructor(
    private readonly browser: Browser,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async fetchOffers(): Promise<Offer[]> {
    const fetchedAt = this.clock();
    const raw = await scrapePage<LidlRawOffer>(this.browser, LIDL_OFFERS_URL, extractLidlOffers);

    const seen = new Set<string>();
    const offers: Offer[] = [];
    for (const r of raw) {
      if (!r.id || !r.title || seen.has(r.id)) continue;
      seen.add(r.id);
      offers.push(normalizeLidlOffer(r, fetchedAt));
    }
    return offers;
  }
}
