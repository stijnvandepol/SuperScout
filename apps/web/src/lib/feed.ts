import type { Offer } from "@superscout/core";
import { CATEGORY_LABEL, categorizeOffer, supermarketName } from "@superscout/core";
import { formatEuro, mechanismDescription, offerSlug, validUntilShort } from "@/lib/format";
import { SITE_URL } from "@/lib/seo";

/**
 * RSS output.
 *
 * The point is alerting without an account: a reader app can poll a feed and
 * tell you when your chain drops new deals, with no login, no e-mail address
 * and nothing for us to store. It is also the one distribution channel the
 * ad-funded folder apps structurally cannot offer, because a feed bypasses
 * the pages their revenue lives on.
 */

/** Escape the five XML entities. Everything below passes through here. */
function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function itemDescription(offer: Offer): string {
  const parts = [
    `${supermarketName(offer.source)} · ${CATEGORY_LABEL[categorizeOffer(offer)]}`,
    mechanismDescription(offer),
  ];

  if (offer.pricing.currentPriceCents !== null) {
    const now = formatEuro(offer.pricing.currentPriceCents);
    const was =
      offer.pricing.originalPriceCents !== null
        ? ` (was ${formatEuro(offer.pricing.originalPriceCents)})`
        : "";
    parts.push(`Prijs: ${now}${was}`);
  }

  if (offer.validUntil) parts.push(`Geldig ${validUntilShort(offer.validUntil)}`);

  return parts.join(" — ");
}

/**
 * RFC 822 date, which is what RSS 2.0 requires. Falls back to the current
 * time when a chain gave us an unparseable stamp, so a single bad row cannot
 * make a reader reject the whole feed.
 */
function rfc822(iso: string): string {
  const date = new Date(iso);
  return (Number.isNaN(date.getTime()) ? new Date() : date).toUTCString();
}

export interface FeedOptions {
  title: string;
  description: string;
  /** Site-relative path of the page this feed mirrors. */
  path: string;
  offers: Offer[];
  /** Feeds are for "what's new", not an archive. */
  limit?: number;
}

export function renderRssFeed({
  title,
  description,
  path,
  offers,
  limit = 50,
}: FeedOptions): string {
  const selected = [...offers]
    .sort((a, b) => (b.fetchedAt ?? "").localeCompare(a.fetchedAt ?? ""))
    .slice(0, limit);

  const newest = selected[0]?.fetchedAt ?? new Date().toISOString();

  const items = selected
    .map((offer) => {
      const url = `${SITE_URL}/aanbieding/${offerSlug(offer)}`;
      return [
        "    <item>",
        `      <title>${xml(offer.title)}${
          offer.pricing.currentPriceCents !== null
            ? xml(` — ${formatEuro(offer.pricing.currentPriceCents)}`)
            : ""
        } (${xml(supermarketName(offer.source))})</title>`,
        `      <link>${xml(url)}</link>`,
        // Stable id: the offer, not the moment it was fetched, so a re-ingest
        // does not resurface the same deal as new in every reader.
        `      <guid isPermaLink="true">${xml(url)}</guid>`,
        `      <pubDate>${rfc822(offer.fetchedAt)}</pubDate>`,
        `      <category>${xml(CATEGORY_LABEL[categorizeOffer(offer)])}</category>`,
        `      <description>${xml(itemDescription(offer))}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xml(title)}</title>
    <link>${xml(`${SITE_URL}${path}`)}</link>
    <description>${xml(description)}</description>
    <language>nl-NL</language>
    <lastBuildDate>${rfc822(newest)}</lastBuildDate>
    <atom:link href="${xml(`${SITE_URL}${path === "/" ? "" : path}/feed.xml`)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

/** Shared response shape: RSS content type plus the site's ISR window. */
export function feedResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=86400",
    },
  });
}
