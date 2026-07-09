import type { MetadataRoute } from "next";
import { categoriesPresent, getOffers } from "@/lib/offers";
import { offerSlug } from "@/lib/format";
import { SITE_URL } from "@/lib/seo";

// Regenerates as the offer set changes.
export const revalidate = 1800;

export default function sitemap(): MetadataRoute.Sitemap {
  const offers = getOffers();

  const offerPages: MetadataRoute.Sitemap = offers.map((offer) => ({
    url: `${SITE_URL}/aanbieding/${offerSlug(offer)}`,
    lastModified: offer.fetchedAt,
    changeFrequency: "daily",
    // NB: no <image:loc> — the chains' image URLs carry unescaped "&" query
    // params that Next does not XML-escape, which corrupts the whole sitemap.
  }));

  const storePages: MetadataRoute.Sitemap = [...new Set(offers.map((o) => o.source))].map(
    (source) => ({ url: `${SITE_URL}/winkel/${source}`, changeFrequency: "daily" }),
  );

  const categoryPages: MetadataRoute.Sitemap = categoriesPresent().map((c) => ({
    url: `${SITE_URL}/categorie/${c.slug}`,
    changeFrequency: "daily",
  }));

  const infoPages: MetadataRoute.Sitemap = ["product", "privacy", "voorwaarden", "ethiek"].map(
    (slug) => ({ url: `${SITE_URL}/${slug}`, changeFrequency: "monthly" }),
  );

  const indexPages: MetadataRoute.Sitemap = ["categorieen", "winkels"].map((slug) => ({
    url: `${SITE_URL}/${slug}`,
    changeFrequency: "daily",
  }));

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    ...indexPages,
    ...storePages,
    ...categoryPages,
    ...offerPages,
    ...infoPages,
  ];
}
