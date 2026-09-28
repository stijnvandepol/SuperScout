import type { Browser } from "playwright";
import type { Offer, SourceAdapter, SupermarketSlug } from "@superscout/core";
import { scrapePage } from "../../browser/intercept";
import type { HoogvlietRawOffer } from "./hoogvliet.raw";
import { normalizeHoogvlietOffer } from "./hoogvliet.normalize";

/**
 * The public offers page. The Intershop catalogue URL the adapter used before
 * (`/INTERSHOP/web/WFS/…/ViewStandardCatalog-Browse`) is disallowed by
 * Hoogvliet's robots.txt; this page is not, and the capture of 28 September
 * 2026 showed it renders the same promotion tiles.
 */
export const HOOGVLIET_OFFERS_URL = "https://www.hoogvliet.com/aanbiedingen";

/** Runs INSIDE the page (page.evaluate) — self-contained, no imports. */
function extractHoogvlietOffers(): HoogvlietRawOffer[] {
  const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
  // Tiles as the catalogue rendered them, or — on /aanbiedingen — the block
  // around each offer link.
  let tiles = Array.from(document.querySelectorAll(".promotionProductTile"));
  if (!tiles.length) {
    tiles = Array.from(document.querySelectorAll("a.product-title[href*='/aanbiedingen/']")).map(
      (a) => a.closest(".product-all-info") ?? a.parentElement ?? a,
    );
  }
  const out: HoogvlietRawOffer[] = [];

  for (const tile of tiles) {
    const promoLabel = clean(tile.querySelector(".promotion-short-title")?.textContent);
    const link = tile.querySelector("a[href*='/aanbiedingen/']") ?? tile.querySelector("a");
    const href = link?.getAttribute("href") ?? "";
    const id = href.match(/\/aanbiedingen\/(\d+)/)?.[1] ?? "";
    if (!id || !promoLabel) continue;

    // Title: the tile's product name, avoiding the promo label / description.
    let title = "";
    for (const el of Array.from(
      tile.querySelectorAll(".product-name, [class*='product-name'], h2, h3, h4"),
    )) {
      const t = clean(el.textContent);
      if (t && t !== promoLabel) {
        title = t;
        break;
      }
    }
    if (!title) continue;

    out.push({
      id,
      title,
      description: clean(tile.querySelector(".Short-Description")?.textContent) || undefined,
      promoLabel,
      // Ranges ("2.05 - 3.80") keep their first, lowest price; spacing between
      // the euro and cent spans is removed in the normalizer.
      priceNow: clean(tile.querySelector(".non-strikethrough")?.textContent) || undefined,
      priceWas: clean(tile.querySelector(".strikethrough div, .strikethrough")?.textContent) || undefined,
      url: href || undefined,
      image:
        tile.querySelector("img")?.getAttribute("src") ??
        tile.querySelector("img")?.getAttribute("data-src") ??
        undefined,
    });
  }
  return out;
}

/** Hoogvliet: Intershop aanbiedingen catalog, scraped through a headless browser. */
export class HoogvlietAdapter implements SourceAdapter {
  readonly source: SupermarketSlug = "hoogvliet";

  constructor(
    private readonly browser: Browser,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async fetchOffers(): Promise<Offer[]> {
    const fetchedAt = this.clock();
    const raw = await scrapePage<HoogvlietRawOffer>(
      this.browser,
      HOOGVLIET_OFFERS_URL,
      extractHoogvlietOffers,
    );

    const seen = new Set<string>();
    const offers: Offer[] = [];
    for (const r of raw) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      offers.push(normalizeHoogvlietOffer(r, fetchedAt));
    }
    return offers;
  }
}
