import { toCardOffer } from "@superscout/core";
import { getOffers } from "@/lib/offers";

export const dynamic = "force-dynamic";

/**
 * Every live offer, projected to what a card needs — the homepage explorer's
 * full set, fetched after the first 48 are on screen. Same order as the page
 * (`getOffers()`), so the window the server rendered is its prefix.
 */
export function GET(): Response {
  return new Response(JSON.stringify({ offers: getOffers().map(toCardOffer) }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
