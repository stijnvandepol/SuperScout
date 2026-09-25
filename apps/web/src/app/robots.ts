import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal utility pages, the operator page and JSON endpoints: no crawl
      // value, and /api would only spend crawl budget on data Google cannot use.
      disallow: ["/mandje", "/volglijst", "/beheer", "/api/"],
    },
    // Two sitemaps: the site's own pages, and the product catalogue — which is
    // an order of magnitude larger and changes on a different rhythm.
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-producten.xml`],
    host: SITE_URL,
  };
}
