import type { Offer } from "@superscout/core";
import { STORE_META } from "@/lib/format";

export const SITE_URL = "https://superscout.nl";
export const SITE_NAME = "SuperScout";

/** schema.org BreadcrumbList for a page's trail. Paths are site-relative. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

/**
 * schema.org Offer for a single deal. We're an aggregator, not the seller, so
 * this is an Offer (with the store as seller), enriched with image + validity.
 */
export function offerJsonLd(offer: Offer, url: string) {
  const store = STORE_META[offer.source];
  const price = offer.pricing.currentPriceCents;
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: offer.title,
    url,
    ...(offer.brand ? { brand: offer.brand } : {}),
    ...(offer.imageUrl ? { image: offer.imageUrl } : {}),
    ...(price !== null ? { price: (price / 100).toFixed(2), priceCurrency: "EUR" } : {}),
    availability: "https://schema.org/InStock",
    ...(offer.validUntil ? { priceValidUntil: offer.validUntil } : {}),
    seller: { "@type": "Organization", name: store.name },
  };
}

/** schema.org CollectionPage + ItemList for a store/category listing. */
export function offerListJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  offers: Offer[];
  slugOf: (o: Offer) => string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: opts.offers.length,
      itemListElement: opts.offers.slice(0, 30).map((o, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/aanbieding/${opts.slugOf(o)}`,
        name: o.title,
      })),
    },
  };
}
