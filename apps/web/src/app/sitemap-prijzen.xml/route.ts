import { productForOffer } from "@/lib/catalogue";
import { allPricePages, lastRelevant } from "@/lib/price-pages";
import { SITE_URL } from "@/lib/seo";

/**
 * Sitemap of the durable per-product price pages.
 *
 * Its own file rather than a section of `sitemap.ts`, for one practical
 * reason: Search Console reports indexing per submitted sitemap, and "how many
 * of the price pages did Google keep" is the number that says whether this
 * whole approach works.
 *
 * Pages that redirect to a catalogue page are left out — a sitemap listing
 * redirects tells Google the file cannot be trusted.
 */
export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function GET(): Promise<Response> {
  const urls = allPricePages()
    .filter((page) => !productForOffer(page.latest))
    .map((page) => {
      // The newest moment anything on the page changed: a fresh copy of a
      // running promotion, or the end of the last one.
      const newest = [...page.live, ...page.upcoming, ...page.past]
        .map((o) => (page.live.includes(o) ? o.fetchedAt : lastRelevant(o)))
        .sort()
        .at(-1);
      const loc = `${SITE_URL}/prijs/${page.chain}/${page.slug}`;
      return (
        `  <url><loc>${escapeXml(loc)}</loc>` +
        (newest ? `<lastmod>${newest.slice(0, 10)}</lastmod>` : "") +
        `</url>`
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
      "cache-control": "public, max-age=0, s-maxage=3600",
    },
  });
}
