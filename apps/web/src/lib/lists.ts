import type { Offer } from "@superscout/core";
import { byBiggestDiscount, getOffers, offersInCategory } from "@/lib/offers";
import { dealTypeBySlug } from "@/lib/deal-types";
import { offersInTopic, topicBySlug } from "@/lib/topics";

/**
 * The offer lists behind the listing pages, defined once.
 *
 * A page renders the first `FIRST_PAGE` cards and a "Toon meer" button fetches
 * the rest from /api/lijst. Both must produce the same list in the same order,
 * or the second page would repeat or skip offers — so neither computes it on
 * its own.
 */
export const LIST_KINDS = ["winkel", "categorie", "actie", "onderwerp"] as const;
export type ListKind = (typeof LIST_KINDS)[number];

/**
 * Cards rendered on the server. Enough to fill two phone screens and give
 * crawlers the sharpest deals; 146 cards on the 1+1 page were ~800 KB of HTML
 * and several thousand DOM nodes to hydrate on a budget phone.
 */
export const FIRST_PAGE = 48;

export function isListKind(value: string): value is ListKind {
  return (LIST_KINDS as readonly string[]).includes(value);
}

/** The ordered list, or null for an unknown slug. */
export function listOffers(kind: ListKind, slug: string): Offer[] | null {
  switch (kind) {
    case "winkel":
      return byBiggestDiscount(getOffers().filter((o) => o.source === slug));
    case "categorie":
      return byBiggestDiscount(offersInCategory(slug));
    case "actie": {
      const type = dealTypeBySlug(slug);
      return type ? byBiggestDiscount(getOffers().filter(type.matches)) : null;
    }
    case "onderwerp": {
      const topic = topicBySlug(slug);
      return topic ? byBiggestDiscount(offersInTopic(getOffers(), topic)) : null;
    }
  }
}
