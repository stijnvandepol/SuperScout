import { byBiggestDiscount, getOffers } from "@/lib/offers";
import { feedResponse, renderRssFeed } from "@/lib/feed";

export const revalidate = 1800;

/** Site-wide feed: the sharpest current deals across every chain. */
export function GET(): Response {
  return feedResponse(
    renderRssFeed({
      title: "SuperScout — supermarktaanbiedingen van deze week",
      description:
        "De scherpste aanbiedingen van Albert Heijn, Jumbo, Lidl, ALDI, PLUS, Dirk, Hoogvliet, DekaMarkt, Poiesz en Sligro. Dagelijks ververst, zonder account.",
      path: "/",
      offers: byBiggestDiscount(getOffers()),
    }),
  );
}
