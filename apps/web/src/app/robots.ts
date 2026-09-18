import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal utility page, no crawl value.
      disallow: "/mandje",
    },
    // Two sitemaps: the site's own pages, and the product catalogue — which is
    // an order of magnitude larger and changes on a different rhythm.
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-producten.xml`],
    host: SITE_URL,
  };
}
