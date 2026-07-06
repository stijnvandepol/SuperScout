import type { Browser } from "playwright";
import type { Offer, SourceAdapter, SupermarketSlug } from "@superscout/core";
import { scrapePage } from "../../browser/intercept";
import type { SligroRawOffer } from "./sligro.raw";
import { normalizeSligroOffer } from "./sligro.normalize";

const SLIGRO_OFFERS_URL = "https://www.sligro.nl/aanbiedingen";

/** Runs INSIDE the page (page.evaluate) — self-contained, no imports. */
function extractSligroOffers(): SligroRawOffer[] {
  const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
  const all = Array.from(document.querySelectorAll('[class*="cmp-productoverview-product"]'));
  const cards = all.filter((c) => c.querySelector(".cmp-price__new, .cmp-price__price"));
  const roots = cards.filter((c) => !cards.some((o) => o !== c && o.contains(c)));
  const out: SligroRawOffer[] = [];

  for (const card of roots) {
    const currentPrice = clean(card.querySelector(".cmp-price__new, .cmp-price__price")?.textContent);
    if (!/\d/.test(currentPrice)) continue;

    const href = card.querySelector('a[href*="/p."]')?.getAttribute("href") ?? "";
    const id = href.match(/\/p\.(\d+)\./)?.[1] ?? "";
    if (!id) continue;

    const title = clean(card.querySelector('[class*="product-info-name"]')?.textContent);
    if (!title) continue;

    out.push({
      id,
      title,
      unit: clean(card.querySelector('[class*="description__unit"]')?.textContent) || undefined,
      currentPrice,
      oldPrice: clean(card.querySelector(".cmp-price__old")?.textContent) || undefined,
      url: href || undefined,
      image: card.querySelector("img")?.getAttribute("src") ?? undefined,
    });
  }
  return out;
}

/** Sligro: B2B wholesaler, client-rendered aanbiedingen page (prices ex-VAT). */
export class SligroAdapter implements SourceAdapter {
  readonly source: SupermarketSlug = "sligro";

  constructor(
    private readonly browser: Browser,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async fetchOffers(): Promise<Offer[]> {
    const fetchedAt = this.clock();
    const raw = await scrapePage<SligroRawOffer>(this.browser, SLIGRO_OFFERS_URL, extractSligroOffers, {
      waitForSelector: ".cmp-price__new, .cmp-price__price",
    });

    const seen = new Set<string>();
    const offers: Offer[] = [];
    for (const r of raw) {
      if (!r.id || seen.has(r.id)) continue;
      seen.add(r.id);
      offers.push(normalizeSligroOffer(r, fetchedAt));
    }
    return offers;
  }
}
