import type { Browser } from "playwright";
import type { Offer, SourceAdapter, SupermarketSlug } from "@superscout/core";
import { scrapePage } from "../../browser/intercept";
import type { AldiRawOffer } from "./aldi.raw";
import { normalizeAldiOffer } from "./aldi.normalize";

const ALDI_OFFERS_URL = "https://www.aldi.nl/aanbiedingen.html";

/**
 * Runs INSIDE the page (Playwright page.evaluate) — self-contained, no imports.
 * Sale price is read from `.tag__label--price` only; the plain `.tag__label`
 * (which holds "-29%" or "OP=OP") and `.tag__marker--base-price` (per-kg) are
 * deliberately not treated as the price.
 */
function extractAldiOffers(): AldiRawOffer[] {
  const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
  const tiles = Array.from(document.querySelectorAll(".product-tile"));
  const out: AldiRawOffer[] = [];

  for (const tile of tiles) {
    const currentPrice = clean(tile.querySelector(".tag__label--price")?.textContent);
    if (!/^\d+[.,]\d{2}$/.test(currentPrice)) continue;

    let discount: string | undefined;
    for (const el of Array.from(tile.querySelectorAll(".tag__label"))) {
      if (el.classList.contains("tag__label--price")) continue;
      const t = clean(el.textContent);
      if (/^-\d+%$/.test(t)) {
        discount = t;
        break;
      }
    }

    const link = tile.querySelector("a[href*='/product/']") ?? tile.querySelector("a");
    const href = link?.getAttribute("href") ?? "";
    const id = href.match(/(\d+)\.html/)?.[1] ?? href;

    out.push({
      id,
      title: clean(tile.querySelector(".product-tile__content__upper__product-name")?.textContent),
      brand: clean(tile.querySelector(".product-tile__content__upper__brand-name")?.textContent) || undefined,
      currentPrice,
      oldPrice: clean(tile.querySelector(".tag__cross-price, .strike-price")?.textContent) || undefined,
      discount,
      unit: clean(tile.querySelector(".tag__marker--salesunit")?.textContent) || undefined,
      url: href || undefined,
      image: tile.querySelector("img")?.getAttribute("src") ?? undefined,
    });
  }
  return out;
}

/** Aldi: server-rendered offers page, scraped through a headless browser. */
export class AldiAdapter implements SourceAdapter {
  readonly source: SupermarketSlug = "aldi";

  constructor(
    private readonly browser: Browser,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async fetchOffers(): Promise<Offer[]> {
    const fetchedAt = this.clock();
    const raw = await scrapePage<AldiRawOffer>(this.browser, ALDI_OFFERS_URL, extractAldiOffers);

    const seen = new Set<string>();
    const offers: Offer[] = [];
    for (const r of raw) {
      if (!r.id || !r.title || seen.has(r.id)) continue;
      seen.add(r.id);
      offers.push(normalizeAldiOffer(r, fetchedAt));
    }
    return offers;
  }
}
