import { byBiggestDiscount, getOffers } from "@/lib/offers";
import { feedResponse, renderRssFeed } from "@/lib/feed";
import { chainSentence } from "@/lib/chains";

// Read at request time, never baked into the build: see `loadRaw` in
// lib/offers.ts for what a build-time prerender of this page contains.
export const dynamic = "force-dynamic";

/** Site-wide feed: the sharpest current deals across every chain. */
export function GET(): Response {
  return feedResponse(
    renderRssFeed({
      title: "SuperScout — supermarktaanbiedingen van deze week",
      description: `De scherpste aanbiedingen van ${chainSentence()}. Dagelijks ververst, zonder account.`,
      path: "/",
      offers: byBiggestDiscount(getOffers()),
    }),
  );
}
