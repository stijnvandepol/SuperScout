import { INGESTED_SUPERMARKETS } from "@superscout/core";
import { catalogueSize, SITEMAP_CHUNK_SIZE } from "@/lib/catalogue";
import { SITE_URL } from "@/lib/seo";

/**
 * Sitemap index for the product catalogue.
 *
 * A sitemap file may hold 50.000 URLs. Albert Heijn alone is 42.354, so a
 * single file fits today and would not the moment Jumbo lands — and discovering
 * that by having Google reject the file is a bad way to find out. Chunking from
 * the start costs one extra route and removes the cliff.
 *
 * Kept out of `sitemap.ts` deliberately: that one describes the site's own
 * pages and is regenerated as offers roll over, while this describes a
 * catalogue that changes far more slowly and is far larger.
 */

export const revalidate = 86_400;

export async function GET(): Promise<Response> {
  const chunks: string[] = [];

  for (const chain of INGESTED_SUPERMARKETS) {
    const total = catalogueSize(chain);
    if (total === 0) continue;

    const pages = Math.ceil(total / SITEMAP_CHUNK_SIZE);
    for (let page = 0; page < pages; page += 1) {
      chunks.push(`${SITE_URL}/sitemap-producten/${chain}/${page}`);
    }
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    chunks.map((loc) => `  <sitemap><loc>${loc}</loc></sitemap>`).join("\n") +
    `\n</sitemapindex>\n`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=86400",
    },
  });
}
