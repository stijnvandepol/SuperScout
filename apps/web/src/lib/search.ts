import type { CardOffer } from "@superscout/core";
import { inTopic, topicForTerm } from "@/lib/topics";

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
 * Lowercased, trimmed, whitespace-collapsed and capped. Diacritics are kept
 * here, because this is also what the watchlist stores and shows back;
 * matching folds them on both sides (see `fold`).
 */
export function normalizeTerm(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, MAX_TERM_LENGTH);
}

type Searchable = Pick<CardOffer, "title" | "brand" | "sourceCategoryRaw" | "rawLabel">;

/** Lowercase without accents, so "creme" finds "crème" and "cafe" finds "café". */
function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Folded search text per offer, computed once. The homepage re-filters ~1.000
 * offers on every keystroke, and Unicode normalisation is not free on a budget
 * phone.
 */
const HAY = new WeakMap<object, string>();

function hayOf(offer: Searchable): string {
  let hay = HAY.get(offer);
  if (hay === undefined) {
    hay = fold(`${offer.title} ${offer.brand ?? ""} ${offer.sourceCategoryRaw ?? ""} ${offer.rawLabel ?? ""}`);
    HAY.set(offer, hay);
  }
  return hay;
}

/**
 * Short words only at the start of a word: "ijs" must find "ijsthee" but not
 * every "2e halve prijs", and "kip" must not match "skippy". From four letters
 * on, a word may sit inside a compound — "pasta" in "tomatenpasta".
 */
function containsWord(hay: string, word: string): boolean {
  if (word.length >= 4) return hay.includes(word);
  let at = hay.indexOf(word);
  while (at !== -1) {
    if (at === 0 || !/[a-z0-9]/.test(hay[at - 1]!)) return true;
    at = hay.indexOf(word, at + 1);
  }
  return false;
}

/**
 * Every word of the term must occur somewhere in the offer's text — or the
 * term names a topic and the offer belongs to it.
 *
 * Word-wise rather than as one substring, so "robijn wasmiddel" finds
 * "Robijn Klein & Krachtig wasmiddel" — the substring version returned nothing
 * for any two-word search whose words were not adjacent in the title.
 *
 * The topic fallback turns the hand-curated topic vocabulary into synonyms:
 * "wasmiddel" also finds "Alle Ariel t/m 30 wasbeurten", "wc papier" finds
 * toiletpapier. Only ever adds matches, never removes one.
 */
export function offerMatches(offer: Searchable, term: string): boolean {
  const needle = fold(normalizeTerm(term));
  if (!needle) return true;
  const hay = hayOf(offer);
  if (needle.split(" ").every((word) => containsWord(hay, word))) return true;
  const topic = topicForTerm(needle);
  return topic !== undefined && inTopic(offer, topic);
}
