import { byBiggestDiscount, getOffers } from "@/lib/offers";
import { feedResponse, renderRssFeed } from "@/lib/feed";
import { chainSentence } from "@/lib/chains";
import { normalizeTerm, offerMatches } from "@/lib/search";
import { SITE_URL } from "@/lib/seo";

// Read at request time, never baked into the build: see `loadRaw` in
// lib/offers.ts for what a build-time prerender of this page contains.
export const dynamic = "force-dynamic";

/**
 * Site-wide feed: the sharpest current deals across every chain.
 *
 * With `?q=luiers` it becomes an alert for one search — the watchlist's push
 * variant. A feed reader polls it and says when something new matches, and we
 * never learn who is following what: there is no subscription to store.
 */
export function GET(request: Request): Response {
  const q = normalizeTerm(new URL(request.url).searchParams.get("q") ?? "");

  if (q.length >= 2) {
    return feedResponse(
      renderRssFeed({
        title: `SuperScout — aanbiedingen voor “${q}”`,
        description: `Nieuwe aanbiedingen die passen bij “${q}”, bij ${chainSentence()}. Dagelijks ververst, zonder account.`,
        path: `/?q=${encodeURIComponent(q)}`,
        selfUrl: `${SITE_URL}/feed.xml?q=${encodeURIComponent(q)}`,
        offers: byBiggestDiscount(getOffers().filter((o) => offerMatches(o, q))),
      }),
    );
  }

  return feedResponse(
    renderRssFeed({
      title: "SuperScout — supermarktaanbiedingen van deze week",
      description: `De scherpste aanbiedingen van ${chainSentence()}. Dagelijks ververst, zonder account.`,
      path: "/",
      offers: byBiggestDiscount(getOffers()),
    }),
  );
}
