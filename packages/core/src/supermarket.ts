/**
 * The supermarkets SuperScout can carry offers for. Extensible: add an entry
 * here and its slug becomes a valid `Offer.source` everywhere, type-checked.
 */
export const SUPERMARKETS = {
  ah: { name: "Albert Heijn", ingested: true },
  jumbo: { name: "Jumbo", ingested: true },
  lidl: { name: "Lidl", ingested: true },
  aldi: { name: "Aldi", ingested: true },
  plus: { name: "Plus", ingested: true },
  dirk: { name: "Dirk", ingested: true },
  hoogvliet: { name: "Hoogvliet", ingested: true },
  dekamarkt: { name: "DekaMarkt", ingested: true },
  vomar: { name: "Vomar", ingested: false },
  coop: { name: "Coop", ingested: false },
  spar: { name: "Spar", ingested: false },
  ekoplaza: { name: "Ekoplaza", ingested: false },
  poiesz: { name: "Poiesz", ingested: true },
  sligro: { name: "Sligro", ingested: true },
} as const;

export type SupermarketSlug = keyof typeof SUPERMARKETS;

export function supermarketName(slug: SupermarketSlug): string {
  return SUPERMARKETS[slug].name;
}

/**
 * Chains an adapter actually fetches, as opposed to slugs the type system
 * merely permits.
 *
 * The distinction is not cosmetic. "Which chains do we cover" was implicit in
 * `sources.ts` and `browser-sources.ts`, so anything reasoning about coverage
 * had to fall back to the full slug list — and a page trying to explain why a
 * chain was missing ended up announcing that Coop, Ekoplaza, Spar and Vomar
 * were "temporarily unavailable" when no adapter for them was ever written.
 *
 * A chain in this list with no offers today is a broken adapter. A chain
 * outside it is simply not built yet. Only the first is worth apologising for.
 */
export const INGESTED_SUPERMARKETS = (
  Object.keys(SUPERMARKETS) as SupermarketSlug[]
).filter((slug) => SUPERMARKETS[slug].ingested);
