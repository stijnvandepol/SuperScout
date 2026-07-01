import type { DiscountMechanism, Offer, SupermarketSlug } from "@superscout/core";

export const NOW = "2026-07-01T12:00:00.000Z";

type OfferOverrides = Partial<Offer> & { id: string; source: SupermarketSlug };

export function makeOffer(o: OfferOverrides): Offer {
  return {
    sourceOfferId: o.id.split(":")[1] ?? o.id,
    title: "Product",
    pricing: { currentPriceCents: null, originalPriceCents: null, savingsAbsoluteCents: null, savingsPercent: null },
    mechanism: { type: "price_drop" } as DiscountMechanism,
    validFrom: "2026-07-01",
    validUntil: "2026-07-07",
    flags: {},
    fetchedAt: NOW,
    ...o,
  };
}

/** A small, deterministic catalog covering every source and mechanism family. */
export const OFFERS: Offer[] = [
  makeOffer({
    id: "dirk:1",
    source: "dirk",
    title: "Bananen",
    brand: "Chiquita",
    url: "https://www.dirk.nl/aanbiedingen",
    sourceCategoryRaw: "Aardappelen, groente & fruit",
    pricing: { currentPriceCents: 99, originalPriceCents: 199, savingsAbsoluteCents: 100, savingsPercent: 50 },
    mechanism: { type: "price_drop" },
    validUntil: "2026-07-07",
  }),
  makeOffer({
    id: "ah:2",
    source: "ah",
    title: "Gerookte zalm",
    brand: "AH",
    url: "https://www.ah.nl/bonus/groep/2",
    rawLabel: "2e gratis",
    mechanism: { type: "buy_x_get_y_free", buyQuantity: 1, freeQuantity: 1 },
    validUntil: "2026-07-05",
  }),
  makeOffer({
    id: "jumbo:3",
    source: "jumbo",
    title: "Valess vleesvervangers",
    brand: "Valess",
    url: "https://www.jumbo.com/aanbiedingen/valess/3",
    rawLabel: "2 voor 4,99",
    mechanism: { type: "multi_buy", buyQuantity: 2, totalPriceCents: 499 },
    validUntil: "2026-07-07",
  }),
  makeOffer({
    id: "plus:4",
    source: "plus",
    title: "Rode wijn",
    brand: "Chateau",
    url: "https://www.plus.nl/aanbiedingen",
    sourceCategoryRaw: "Wijn, bier, sterke drank",
    pricing: { currentPriceCents: 149, originalPriceCents: 199, savingsAbsoluteCents: 50, savingsPercent: 25 },
    mechanism: { type: "percentage_off", percent: 25 },
    validUntil: "2026-07-02", // expiring soon vs NOW
  }),
  makeOffer({
    id: "dirk:5",
    source: "dirk",
    title: "Elstar appels",
    brand: "Elstar",
    // no url -> card links to our compare page instead of a store
    pricing: { currentPriceCents: 129, originalPriceCents: 159, savingsAbsoluteCents: 30, savingsPercent: 19 },
    mechanism: { type: "price_drop" },
    validUntil: "2026-07-07",
  }),
];
