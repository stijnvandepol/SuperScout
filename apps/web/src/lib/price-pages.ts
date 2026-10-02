import type { Offer, SupermarketSlug } from "@superscout/core";
import { priceSlug } from "@superscout/core";
import { archivedStatus, getArchivedOffers, getOffers } from "@/lib/offers";

/**
 * One durable page per product per chain: `/prijs/{chain}/{slug}`.
 *
 * Search Console showed what ranks: offer pages on long-tail product queries
 * ("dirk ventilator", "sinji car display 7 inch"), at position 6-12. Each of
 * those URLs belongs to one promotion and died with it, so every week the site
 * threw away exactly the pages Google had started to trust. The catalogue fixed
 * that for the two chains that have one; this fixes it for the rest.
 *
 * It is deliberately not an archive page. A finished promotion on its own was
 * a dead end and was removed for that reason; this page leads with what can be
 * bought *now* — the running promotion, or the same product elsewhere, or the
 * closest alternatives — and keeps the past as supporting evidence ("is this a
 * good price, how often does it come back").
 */

export interface PricePage {
  chain: SupermarketSlug;
  slug: string;
  /** Running today, per the live file — the only authority on that. */
  live: Offer[];
  /** Published, not yet started. */
  upcoming: Offer[];
  /** Ended, newest first. */
  past: Offer[];
  /** The copy that names the page: live, else upcoming, else the newest past. */
  latest: Offer;
}

export function pricePath(offer: Pick<Offer, "source" | "title">): string | null {
  const slug = priceSlug(offer);
  return slug ? `/prijs/${offer.source}/${slug}` : null;
}

/** When a promotion stopped being shown: its end date, else when we last saw it. */
export function lastRelevant(offer: Offer): string {
  return offer.validUntil || offer.fetchedAt;
}

const TTL_MS = 60_000;
let cache: { at: number; pages: Map<string, PricePage> } | null = null;

/**
 * Build every page from the live set plus the archive.
 *
 * Tens of thousands of archived offers, so built once a minute rather than per
 * request — the live set refreshes on the same rhythm. Live copies win over the
 * archive's, which holds every promotion including today's.
 */
function index(nowIso: string): Map<string, PricePage> {
  const now = Date.parse(nowIso);
  if (cache && now - cache.at < TTL_MS) return cache.pages;

  const pages = new Map<string, PricePage>();
  const pageFor = (offer: Offer): PricePage | null => {
    const slug = priceSlug(offer);
    if (!slug) return null;
    const key = `${offer.source}/${slug}`;
    let page = pages.get(key);
    if (!page) {
      page = { chain: offer.source, slug, live: [], upcoming: [], past: [], latest: offer };
      pages.set(key, page);
    }
    return page;
  };

  const live = getOffers();
  const liveIds = new Set(live.map((o) => o.id));
  for (const offer of live) pageFor(offer)?.live.push(offer);

  for (const offer of getArchivedOffers()) {
    if (liveIds.has(offer.id)) continue;
    const page = pageFor(offer);
    if (!page) continue;
    if (archivedStatus(offer, nowIso) === "upcoming") page.upcoming.push(offer);
    else page.past.push(offer);
  }

  for (const page of pages.values()) {
    page.past.sort((a, b) => lastRelevant(b).localeCompare(lastRelevant(a)));
    page.upcoming.sort((a, b) => a.validFrom.localeCompare(b.validFrom));
    page.latest = page.live[0] ?? page.upcoming[0] ?? page.past[0] ?? page.latest;
  }

  cache = { at: Number.isNaN(now) ? Date.now() : now, pages };
  return pages;
}

export function pricePage(
  chain: string,
  slug: string,
  nowIso: string = new Date().toISOString(),
): PricePage | undefined {
  return index(nowIso).get(`${chain}/${slug}`);
}

export function allPricePages(nowIso: string = new Date().toISOString()): PricePage[] {
  return [...index(nowIso).values()];
}

/** How many separate promotions a page has seen, live and upcoming included. */
export function promotionCount(page: PricePage): number {
  return page.live.length + page.upcoming.length + page.past.length;
}
