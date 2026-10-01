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
    // The site's own pages; the product catalogue, an order of magnitude larger
    // and on a different rhythm; and the per-product price pages, separate so
    // Search Console reports their indexing on its own.
    sitemap: [
      `${SITE_URL}/sitemap.xml`,
      `${SITE_URL}/sitemap-producten.xml`,
      `${SITE_URL}/sitemap-prijzen.xml`,
    ],
    host: SITE_URL,
  };
}
