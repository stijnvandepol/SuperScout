import type { Offer } from "@superscout/core";
import { priceSlug } from "@superscout/core";

/**
 * Tell IndexNow (Bing, Yandex, Seznam, Naver) which pages changed today.
 *
 * The deploy already submitted the sitemap, but deploys are irregular and the
 * offers change every morning: a promotion that starts on Wednesday sat
 * undiscovered until whenever the next deploy happened to run. Bing's index is
 * also what DuckDuckGo, Ecosia, and the search behind ChatGPT and Copilot
 * draw on, so this is the cheapest reach the site has beyond Google.
 *
 * Only what changed, as the protocol asks: new and ended promotions, their
 * durable price pages, and the listings they appear on. Resubmitting all URLs
 * every day would teach the endpoint that our submissions mean nothing.
 */

const ENDPOINT = "https://api.indexnow.org/IndexNow";
/** The protocol caps one submission at 10.000 URLs. */
const MAX_URLS = 10_000;

export interface ChangeOptions {
  site: string;
  /**
   * Chains whose price page redirects to a catalogue page. Submitting a URL
   * that redirects costs reputation with the endpoint, so those are skipped.
   */
  catalogueChains: ReadonlySet<string>;
}

/** URLs whose content differs between yesterday's offer set and today's. */
export function changedUrls(previous: Offer[], current: Offer[], options: ChangeOptions): string[] {
  const before = new Map(previous.map((o) => [o.id, o]));
  const after = new Map(current.map((o) => [o.id, o]));

  const added = current.filter((o) => !before.has(o.id));
  // An ended promotion's URL now redirects, and its price page now says "nu
  // niet in de aanbieding": both are changes worth recrawling.
  const ended = previous.filter((o) => !after.has(o.id));
  if (added.length === 0 && ended.length === 0) return [];

  const urls = new Set<string>([`${options.site}/`, `${options.site}/beste-aanbiedingen`]);
  for (const offer of [...added, ...ended]) {
    urls.add(`${options.site}/winkel/${offer.source}`);
    urls.add(`${options.site}/aanbieding/${offer.source}-${offer.sourceOfferId}`);
    const slug = priceSlug(offer);
    if (slug && !options.catalogueChains.has(offer.source)) {
      urls.add(`${options.site}/prijs/${offer.source}/${slug}`);
    }
  }

  return [...urls].slice(0, MAX_URLS);
}

export interface SubmitOptions {
  key: string;
  site: string;
  fetchImpl?: typeof fetch;
}

/** Submit a batch; returns the HTTP status. Never throws for a rejected batch. */
export async function submitIndexNow(urls: string[], options: SubmitOptions): Promise<number> {
  if (urls.length === 0) return 0;
  const doFetch = options.fetchImpl ?? fetch;

  const res = await doFetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(options.site).host,
      key: options.key,
      keyLocation: `${options.site}/indexnow.txt`,
      urlList: urls,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  return res.status;
}
