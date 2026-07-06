/**
 * The supermarkets SuperScout can carry offers for. Extensible: add an entry
 * here and its slug becomes a valid `Offer.source` everywhere, type-checked.
 */
export const SUPERMARKETS = {
  ah: { name: "Albert Heijn" },
  jumbo: { name: "Jumbo" },
  lidl: { name: "Lidl" },
  aldi: { name: "Aldi" },
  plus: { name: "Plus" },
  dirk: { name: "Dirk" },
  hoogvliet: { name: "Hoogvliet" },
  dekamarkt: { name: "DekaMarkt" },
  vomar: { name: "Vomar" },
  coop: { name: "Coop" },
  spar: { name: "Spar" },
  ekoplaza: { name: "Ekoplaza" },
  poiesz: { name: "Poiesz" },
  sligro: { name: "Sligro" },
} as const;

export type SupermarketSlug = keyof typeof SUPERMARKETS;

export function supermarketName(slug: SupermarketSlug): string {
  return SUPERMARKETS[slug].name;
}
