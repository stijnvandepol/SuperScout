import type { Browser } from "playwright";
import type { Offer, SourceAdapter, SupermarketSlug } from "@superscout/core";
import { scrapePage } from "../../browser/intercept";
import type { PoieszRawOffer, PoieszScrape } from "./poiesz.raw";
import { normalizePoieszOffer } from "./poiesz.normalize";
import { parsePoieszPeriod } from "./poiesz.validity";

// The apex domain redirects to webwinkel.* and reliably renders the offers.
const POIESZ_OFFERS_URL = "https://www.poiesz-supermarkten.nl/aanbiedingen";

/** Runs INSIDE the page (page.evaluate) — self-contained, no imports. */
function extractPoieszOffers(): PoieszScrape[] {
  const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
  const all = Array.from(document.querySelectorAll('[class*="promotion-card__container"]'));
  // Keep only outermost cards (avoid nested duplicates).
  const cards = all.filter((c) => !all.some((o) => o !== c && o.contains(c)));
  const out: PoieszRawOffer[] = [];

  for (const card of cards) {
    const title = clean(card.querySelector('[class*="__title"]')?.textContent);
    const currentPrice = clean(card.querySelector('[class*="new-price-double__lowest"]')?.textContent);
    if (!title || !/\d/.test(currentPrice)) continue;

    // The whole card is wrapped in the detail link — it's an ancestor, not a child.
    const href =
      card.closest('a[href*="/aanbiedingen/"]')?.getAttribute("href") ??
      card.querySelector('a[href*="/aanbiedingen/"]')?.getAttribute("href") ??
      "";
    const id = href.match(/\/aanbiedingen\/(\d+)/)?.[1] ?? "";
    if (!id) continue;

    const promo = clean(
      Array.from(card.querySelectorAll('[class*="line--"]'))
        .map((e) => clean(e.textContent))
        .join(" "),
    );

    out.push({
      id,
      title,
      currentPrice,
      promo: promo || undefined,
      url: href || undefined,
      image: card.querySelector("img")?.getAttribute("src") ?? undefined,
    });
  }
  // The folder period is in the page payload, not the cards.
  return [{ offers: out, html: document.documentElement.outerHTML }];
}

/** Poiesz: client-rendered aanbiedingen page, scraped through a headless browser. */
export class PoieszAdapter implements SourceAdapter {
  readonly source: SupermarketSlug = "poiesz";

  constructor(
    private readonly browser: Browser,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async fetchOffers(): Promise<Offer[]> {
    const fetchedAt = this.clock();
    const scraped = await scrapePage<PoieszScrape>(
      this.browser,
      POIESZ_OFFERS_URL,
      extractPoieszOffers,
      { waitForSelector: '[class*="promotion-card__container"]' },
    );
    const pass = scraped[0];
    if (!pass) return [];

    // One period covers the whole folder; null when the payload shape moved,
    // in which case offers still flow, just without dates.
    const period = parsePoieszPeriod(pass.html);

    const seen = new Set<string>();
    const offers: Offer[] = [];
    for (const r of pass.offers) {
      if (!r.id || seen.has(r.id)) continue;
      seen.add(r.id);
      offers.push(normalizePoieszOffer(period ? { ...r, ...period } : r, fetchedAt));
    }
    return offers;
  }
}
