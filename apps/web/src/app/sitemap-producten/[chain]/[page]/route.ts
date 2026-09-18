import type { SupermarketSlug } from "@superscout/core";
import { INGESTED_SUPERMARKETS, titleSlug } from "@superscout/core";
import { productIndex, SITEMAP_CHUNK_SIZE } from "@/lib/catalogue";
import { SITE_URL } from "@/lib/seo";

/**
 * One chunk of product URLs.
 *
 * Reads ids and titles rather than whole rows: a sitemap needs a URL and a
 * timestamp, and pulling 20.000 complete products to build them would read an
 * order of magnitude more than necessary.
 *
 * `lastModified` is the ingestion timestamp, which is honest — it is when we
 * last confirmed the price — rather than "now", which would tell Google every
 * product changed every night and train it to ignore the field.
 */

export const revalidate = 86_400;

/** XML text nodes cannot carry raw & or <; a product title routinely has both. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ chain: string; page: string }> },
): Promise<Response> {
  const { chain, page } = await params;

  if (!INGESTED_SUPERMARKETS.includes(chain as SupermarketSlug)) {
    return new Response("Not found", { status: 404 });
  }

  const index = Number.parseInt(page, 10);
  if (!Number.isInteger(index) || index < 0) {
    return new Response("Not found", { status: 404 });
  }

  const rows = productIndex(chain as SupermarketSlug, SITEMAP_CHUNK_SIZE, index * SITEMAP_CHUNK_SIZE);
  if (rows.length === 0) return new Response("Not found", { status: 404 });

  const urls = rows.map((row) => {
    const loc = `${SITE_URL}/product/${chain}/${row.sourceProductId}/${titleSlug(row.title)}`;
    return (
      `  <url><loc>${escapeXml(loc)}</loc>` +
      `<lastmod>${row.fetchedAt.slice(0, 10)}</lastmod>` +
      `<changefreq>weekly</changefreq></url>`
    );
  });

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.join("\n") +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=86400",
    },
  });
}
