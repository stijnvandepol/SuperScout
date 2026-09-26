import type { SupermarketSlug } from "@superscout/core";

/**
 * Every URL each chain adapter requests, for the robots.txt check.
 *
 * Kept next to the adapters rather than inside them so the gate can run
 * before any adapter makes a request. A test fails when an adapter's URL
 * constant is not listed here — a gate that silently misses one URL is not a
 * gate.
 */
export const SOURCE_URLS: Partial<Record<SupermarketSlug, readonly string[]>> = {
  ah: ["https://api.ah.nl/mobile-auth/v1/auth/token/anonymous", "https://api.ah.nl/graphql"],
  jumbo: ["https://www.jumbo.com/api/graphql"],
  dirk: ["https://www.dirk.nl/api/offers/current/1"],
  plus: ["https://www.plus.nl/aanbiedingen"],
  lidl: ["https://www.lidl.nl/c/aanbiedingen/a10008785"],
  aldi: ["https://www.aldi.nl/aanbiedingen.html"],
  hoogvliet: [
    "https://www.hoogvliet.com/INTERSHOP/web/WFS/org-webshop-Site/nl_NL/-/EUR/ViewStandardCatalog-Browse?CategoryName=aanbiedingen&CatalogID=schappen",
  ],
  dekamarkt: ["https://www.dekamarkt.nl/aanbiedingen"],
  poiesz: ["https://www.poiesz-supermarkten.nl/aanbiedingen"],
  sligro: ["https://www.sligro.nl/aanbiedingen"],
};
