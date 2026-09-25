import type { CardOffer } from "@superscout/core";

/**
 * One definition of "this offer matches this search".
 *
 * The homepage filters in the browser, the search API filters on the server
 * and the watchlist compares both against what a visitor saw last time. If the
 * three disagreed, a followed term would announce "3 nieuw" on the homepage
 * and show two on the watchlist page — exactly the kind of small untruth that
 * makes people stop trusting a counter.
 */

/** Longest term we accept anywhere; longer input is almost certainly not a product search. */
export const MAX_TERM_LENGTH = 60;

/**
 * Lowercased, trimmed, whitespace-collapsed and capped. Diacritics are kept:
 * shoppers type "creme" and "crème" both, and the chains are just as
 * inconsistent, so folding would help as often as it hurts.
 */
export function normalizeTerm(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, MAX_TERM_LENGTH);
}

type Searchable = Pick<CardOffer, "title" | "brand" | "sourceCategoryRaw" | "rawLabel">;

/**
 * Every word of the term must occur somewhere in the offer's text.
 *
 * Word-wise rather than as one substring, so "robijn wasmiddel" finds
 * "Robijn Klein & Krachtig wasmiddel" — the substring version returned nothing
 * for any two-word search whose words were not adjacent in the title.
 */
export function offerMatches(offer: Searchable, term: string): boolean {
  const needle = normalizeTerm(term);
  if (!needle) return true;
  const hay =
    `${offer.title} ${offer.brand ?? ""} ${offer.sourceCategoryRaw ?? ""} ${offer.rawLabel ?? ""}`.toLowerCase();
  return needle.split(" ").every((word) => hay.includes(word));
}
