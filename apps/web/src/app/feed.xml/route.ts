import { byBiggestDiscount, getOffers } from "@/lib/offers";
import { feedResponse, renderRssFeed } from "@/lib/feed";
import { chainSentence } from "@/lib/chains";

export const revalidate = 1800;

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
