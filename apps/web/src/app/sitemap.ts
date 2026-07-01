import type { MetadataRoute } from "next";
import { categoriesPresent, getOffers } from "@/lib/offers";
import { offerSlug } from "@/lib/format";

// TODO: read from an env var once the production domain is set.
const BASE_URL = "https://superscout.nl";

export default function sitemap(): MetadataRoute.Sitemap {
  const offers = getOffers();
  const offerPages: MetadataRoute.Sitemap = offers.map((offer) => ({
    url: `${BASE_URL}/aanbieding/${offerSlug(offer)}`,
    lastModified: offer.fetchedAt,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const storePages: MetadataRoute.Sitemap = [...new Set(offers.map((o) => o.source))].map(
    (source) => ({
      url: `${BASE_URL}/winkel/${source}`,
      changeFrequency: "daily",
      priority: 0.6,
    }),
  );

  const categoryPages: MetadataRoute.Sitemap = categoriesPresent().map((c) => ({
    url: `${BASE_URL}/categorie/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    ...storePages,
    ...categoryPages,
    ...offerPages,
  ];
}
