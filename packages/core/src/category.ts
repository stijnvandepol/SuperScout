import type { Offer } from "./offer";

/**
 * SuperScout's normalized category taxonomy. Chains group offers very
 * differently (Plus "Kaas, vleeswaren, tapas", AH "Borrel, chips, snacks",
 * Dirk "Aardappelen, groente & fruit", Jumbo none), so we map each offer's
 * raw category (or, failing that, its title) onto one of these.
 */
export const CATEGORIES = [
  { slug: "groente-fruit", label: "Groente & fruit" },
  { slug: "vlees-vis", label: "Vlees & vis" },
  { slug: "kaas-vleeswaren", label: "Kaas & vleeswaren" },
  { slug: "zuivel", label: "Zuivel & eieren" },
  { slug: "brood", label: "Brood & gebak" },
  { slug: "ontbijt", label: "Ontbijt & beleg" },
  { slug: "maaltijden", label: "Kant-en-klaar" },
  { slug: "pasta-rijst", label: "Pasta, rijst & wereld" },
  { slug: "sauzen-conserven", label: "Soepen, sauzen & conserven" },
  { slug: "snacks", label: "Chips & snacks" },
  { slug: "snoep-koek", label: "Snoep & koek" },
  { slug: "frisdrank", label: "Frisdrank & sap" },
  { slug: "koffie-thee", label: "Koffie & thee" },
  { slug: "water", label: "Water" },
  { slug: "bier-wijn", label: "Bier, wijn & sterk" },
  { slug: "drogisterij", label: "Drogisterij & verzorging" },
  { slug: "huishouden", label: "Huishouden" },
  { slug: "baby", label: "Baby" },
  { slug: "huisdier", label: "Huisdieren" },
  { slug: "overig", label: "Overig" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export const CATEGORY_LABEL = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.label]),
) as Record<CategorySlug, string>;

// Ordered rules — first keyword hit wins, so more specific groups come first
// (e.g. "ontbijt" before "brood" so "broodbeleg" doesn't become Brood).
const RULES: ReadonlyArray<{ match: readonly string[]; slug: CategorySlug }> = [
  { match: ["gratis bezorging", "bezorg"], slug: "overig" },
  { match: ["kaas"], slug: "kaas-vleeswaren" },
  { match: ["zuivel", "eieren", "yoghurt", "boter", "melk"], slug: "zuivel" },
  { match: ["ontbijt", "granen", "beleg", "muesli"], slug: "ontbijt" },
  { match: ["brood", "gebak", "bakker", "bakprod"], slug: "brood" },
  { match: ["kant-en-klaar", "maaltijd"], slug: "maaltijden" },
  { match: ["vlees", "vis", "kip", "vega", "gehakt", "worst"], slug: "vlees-vis" },
  { match: ["baby", "luier"], slug: "baby" },
  { match: ["huisdier", "hondenv", "kattenv", "dierenv"], slug: "huisdier" },
  { match: ["drogist", "verzorging", "styling", "deodorant", "shampoo", "douche", "tandpasta"], slug: "drogisterij" },
  { match: ["schoonmaak", "toiletpapier", "wasmiddel", "huishoud", "afwas"], slug: "huishouden" },
  { match: ["snoep", "chocola", "koek", "drop", "reep", "wafel"], slug: "snoep-koek" },
  { match: ["chips", "snack", "borrel", "popcorn", "toast", "zoutjes", "noten"], slug: "snacks" },
  { match: ["wijn", "bier", "sterke drank", "speciaalbier", "likeur"], slug: "bier-wijn" },
  { match: ["frisdrank", "fris ", "sappen", "sap", "cola", "limonade", "siroop", "energydrink", "energiedrank"], slug: "frisdrank" },
  { match: ["koffie", "thee", "cappuccino", "espresso"], slug: "koffie-thee" },
  { match: ["water", "mineraalwater", "bronwater"], slug: "water" },
  { match: ["pasta", "rijst", "internationale", "wereld", "noedel"], slug: "pasta-rijst" },
  { match: ["soep", "conserv", "saus", "smaakmaker", "olie", "azijn"], slug: "sauzen-conserven" },
  { match: ["groente", "fruit", "aardappel"], slug: "groente-fruit" },
];

function classify(text: string): CategorySlug {
  const basis = ` ${text.toLowerCase()} `;
  for (const rule of RULES) {
    if (rule.match.some((keyword) => basis.includes(keyword))) return rule.slug;
  }
  return "overig";
}

/**
 * Map an offer onto a normalized category slug. The product title is tried
 * first (most specific — "Coca-Cola" -> frisdrank even when the source lumps
 * "Frisdrank, sappen, koffie, thee"), falling back to the source category.
 */
export function categorizeOffer(offer: Offer): CategorySlug {
  const byTitle = classify(offer.title);
  if (byTitle !== "overig") return byTitle;
  if (offer.sourceCategoryRaw) {
    const byCategory = classify(offer.sourceCategoryRaw);
    if (byCategory !== "overig") return byCategory;
  }
  return "overig";
}
