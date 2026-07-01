import type { MetadataRoute } from "next";
import { OFFERS } from "@/lib/offers";
import { offerSlug } from "@/lib/format";

// TODO: read from an env var once the production domain is set.
const BASE_URL = "https://superscout.nl";

export default function sitemap(): MetadataRoute.Sitemap {
  const offerPages: MetadataRoute.Sitemap = OFFERS.map((offer) => ({
    url: `${BASE_URL}/aanbieding/${offerSlug(offer)}`,
    lastModified: offer.fetchedAt,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  return [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    ...offerPages,
  ];
}
