import type { Browser } from "playwright";
import type { Offer, SourceAdapter, SupermarketSlug } from "@superscout/core";
import { scrapePage } from "../../browser/intercept";
import type { DekamarktRawOffer, DekamarktScrape } from "./dekamarkt.raw";
import { normalizeDekamarktOffer } from "./dekamarkt.normalize";
import { normaliseTitle, parseDekamarktValidity } from "./dekamarkt.validity";

const DEKAMARKT_OFFERS_URL = "https://www.dekamarkt.nl/aanbiedingen";

/**
 * Runs INSIDE the page (page.evaluate) — self-contained, no imports. The offer
 * price box renders "{label}{current}{old}"; the old price sits in a
 * `.regular-strike`, so the current price is the last price token once the
 * strike value is stripped off.
 */
function extractDekamarktOffers(): DekamarktScrape[] {
  const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
  const cards = Array.from(document.querySelectorAll(".product__card"));
  const out: DekamarktRawOffer[] = [];

  for (const card of cards) {
    const id = card.getAttribute("data-product-id") ?? "";
    const title = clean(card.querySelector(".title")?.textContent);
    const box = card.querySelector(".price__label--offer__box, .price__label--offer");
    if (!id || !title || !box) continue;

    const boxText = clean(box.textContent);
    const oldPrice = clean(card.querySelector('[class*="strike"]')?.textContent) || undefined;

    let boxNoStrike = boxText;
    if (oldPrice) {
      const i = boxNoStrike.lastIndexOf(oldPrice);
      if (i >= 0) boxNoStrike = boxNoStrike.slice(0, i);
    }
    const prices = boxNoStrike.match(/\d+[.,]\d{2}/g) ?? [];
    const currentPrice = prices.length ? prices[prices.length - 1]! : "";
    if (!currentPrice) continue;

    const label = boxText.replace(/\s*\d+[.,]\d{2}.*$/, "").trim();

    out.push({
      id,
      title,
      addition: clean(card.querySelector(".addition")?.textContent) || undefined,
      label: label || undefined,
      currentPrice,
      oldPrice,
      image: card.querySelector("img")?.getAttribute("src") ?? undefined,
    });
  }
  // The promotion dates are not on the cards; they sit in the Nuxt payload.
  return [{ offers: out, html: document.documentElement.outerHTML }];
}

/** DekaMarkt: server-rendered aanbiedingen page, scraped through a headless browser. */
export class DekamarktAdapter implements SourceAdapter {
  readonly source: SupermarketSlug = "dekamarkt";

  constructor(
    private readonly browser: Browser,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async fetchOffers(): Promise<Offer[]> {
    const fetchedAt = this.clock();
    const scraped = await scrapePage<DekamarktScrape>(
      this.browser,
      DEKAMARKT_OFFERS_URL,
      extractDekamarktOffers,
    );
    const pass = scraped[0];
    if (!pass) return [];

    const validity = parseDekamarktValidity(pass.html);

    const seen = new Set<string>();
    const offers: Offer[] = [];
    for (const r of pass.offers) {
      if (!r.id || seen.has(r.id)) continue;
      seen.add(r.id);

      // Title first, then the folder-wide period: DekaMarkt runs one week at a
      // time, so `common` covers whatever the title join happens to miss.
      const period = validity.byTitle.get(normaliseTitle(r.title)) ?? validity.common;
      offers.push(normalizeDekamarktOffer(period ? { ...r, ...period } : r, fetchedAt));
    }
    return offers;
  }
}
