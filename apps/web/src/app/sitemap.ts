import type { MetadataRoute } from "next";
import type { Offer } from "@superscout/core";
import { categoriesPresent, getOffers } from "@/lib/offers";
import { offerSlug } from "@/lib/format";
import { DEAL_TYPES } from "@/lib/deal-types";
import { SITE_URL } from "@/lib/seo";

// Regenerates as the offer set changes.
export const revalidate = 1800;

/** Newest ingestion timestamp in a slice — the honest lastModified for a listing. */
function newestFetch(offers: Offer[]): string | undefined {
  let newest: string | undefined;
  for (const offer of offers) {
    if (!newest || offer.fetchedAt > newest) newest = offer.fetchedAt;
  }
  return newest;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const offers = getOffers();
  // A single honest site-wide timestamp for pages whose content is the whole
  // offer set. Guessing "now" here would tell Google every page changed on
  // every regeneration, which trains it to distrust the field entirely.
  const siteModified = newestFetch(offers);

  const offerPages: MetadataRoute.Sitemap = offers.map((offer) => ({
    url: `${SITE_URL}/aanbieding/${offerSlug(offer)}`,
    lastModified: offer.fetchedAt,
    changeFrequency: "daily",
    priority: 0.6,
    // NB: no <image:loc> — the chains' image URLs carry unescaped "&" query
    // params that Next does not XML-escape, which corrupts the whole sitemap.
  }));

  const storePages: MetadataRoute.Sitemap = [...new Set(offers.map((o) => o.source))].map(
    (source) => ({
      url: `${SITE_URL}/winkel/${source}`,
      lastModified: newestFetch(offers.filter((o) => o.source === source)),
      changeFrequency: "daily",
      priority: 0.9,
    }),
  );

  const categoryPages: MetadataRoute.Sitemap = categoriesPresent().map((c) => ({
    url: `${SITE_URL}/categorie/${c.slug}`,
    lastModified: siteModified,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // Mirrors the route's own guard: a deal type with no live offers 404s, so
  // listing it here would feed Google a known-dead URL.
  const dealTypePages: MetadataRoute.Sitemap = DEAL_TYPES.filter(
    (type) => offers.some(type.matches),
  ).map((type) => ({
    url: `${SITE_URL}/acties/${type.slug}`,
    lastModified: siteModified,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  const infoPages: MetadataRoute.Sitemap = ["product", "privacy", "voorwaarden", "ethiek"].map(
    (slug) => ({ url: `${SITE_URL}/${slug}`, changeFrequency: "monthly", priority: 0.3 }),
  );

  const indexPages: MetadataRoute.Sitemap = ["categorieen", "winkels", "acties"].map((slug) => ({
    url: `${SITE_URL}/${slug}`,
    lastModified: siteModified,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [
    { url: SITE_URL, lastModified: siteModified, changeFrequency: "daily", priority: 1 },
    ...indexPages,
    ...storePages,
    ...categoryPages,
    ...dealTypePages,
    ...offerPages,
    ...infoPages,
  ];
}
