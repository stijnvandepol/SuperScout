import type { Metadata } from "next";
import type { Offer } from "@superscout/core";
import { CATEGORY_LABEL, categorizeOffer } from "@superscout/core";
import { STORE_META } from "@/lib/format";

export const SITE_URL = "https://superscout.nl";
export const SITE_NAME = "SuperScout";

/**
 * Feed autodiscovery, to be spread into any page that declares `alternates`.
 *
 * Next replaces the whole `alternates` object when a page defines one, so a
 * page setting only `canonical` silently drops the layout's feed link. The
 * homepage did exactly that, which is the one page readers actually probe.
 */
export const SITE_FEED_ALTERNATE: NonNullable<Metadata["alternates"]>["types"] = {
  "application/rss+xml": [{ url: "/feed.xml", title: "SuperScout — alle aanbiedingen" }],
};

/** schema.org BreadcrumbList for a page's trail. Paths are site-relative. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

/** How far ahead a supermarket week-deal can plausibly be guaranteed. */
const MAX_PRICE_VALIDITY_DAYS = 120;

/**
 * `priceValidUntil` as a plain date, or undefined when we cannot stand behind it.
 *
 * Google reads this field as "the price is guaranteed until", and some chains
 * ship a sentinel end date (2099-12-31) for open-ended promos. Passing that
 * through would claim a decade-long price guarantee on a weekly deal, so
 * anything implausibly far out is dropped instead of forwarded.
 */
function honestPriceValidUntil(validUntil: string): string | undefined {
  if (!validUntil) return undefined;

  const date = new Date(validUntil);
  if (Number.isNaN(date.getTime())) return undefined;

  const daysAhead = (date.getTime() - Date.now()) / 86_400_000;
  if (daysAhead > MAX_PRICE_VALIDITY_DAYS) return undefined;

  return validUntil.slice(0, 10);
}

/**
 * schema.org Product for a deal page.
 *
 * Deliberately Product-with-nested-Offer rather than a bare Offer: a top-level
 * Offer node is valid schema.org but Google ignores it entirely, so it can
 * never produce a rich result. Product + offers is what powers the price and
 * availability line under the blue link — the whole CTR win.
 *
 * We are an aggregator, not the seller, so `seller` is the chain and the offer
 * `url` stays on our page (that is where the deal is described). Merchant-only
 * fields (return policy, shipping) are intentionally absent: claiming them
 * would be false, and Google penalises markup that misrepresents the page.
 *
 * Every emitted field must also be visible on the page — that is Google's
 * structured-data policy, and it is why `price` is omitted when we have no
 * explicit per-unit price to show (e.g. "2 voor €3,99" mechanisms).
 *
 * An `expired` offer still gets markup, but flipped to `OfferedBySoldOut`-style
 * honesty: availability drops to SoldOut and `priceValidUntil` is omitted
 * entirely. Leaving InStock on a promotion that ended in July is exactly the
 * misrepresentation Google demotes sites for, and the archive is only worth
 * keeping if what it claims is true.
 */
export function productJsonLd(offer: Offer, url: string, opts?: { expired?: boolean }) {
  const store = STORE_META[offer.source];
  const price = offer.pricing.currentPriceCents;
  // EAN-13 only; the field is strictly typed and a wrong length invalidates it.
  const gtin = offer.productEans?.find((ean) => /^\d{13}$/.test(ean));
  const expired = opts?.expired === true;
  const validUntil = expired ? undefined : honestPriceValidUntil(offer.validUntil);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: offer.title,
    ...(offer.description ? { description: offer.description } : {}),
    ...(offer.imageUrl ? { image: [offer.imageUrl] } : {}),
    ...(offer.brand ? { brand: { "@type": "Brand", name: offer.brand } } : {}),
    ...(gtin ? { gtin13: gtin } : {}),
    sku: offer.id,
    category: CATEGORY_LABEL[categorizeOffer(offer)],
    offers: {
      "@type": "Offer",
      url,
      availability: expired ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      ...(price !== null ? { price: (price / 100).toFixed(2), priceCurrency: "EUR" } : {}),
      ...(validUntil ? { priceValidUntil: validUntil } : {}),
      seller: {
        "@type": "Organization",
        name: store.name,
        url: store.offersUrl,
      },
    },
  };
}

/** schema.org CollectionPage + ItemList for a store/category/deal-type listing. */
export function offerListJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  offers: Offer[];
  slugOf: (o: Offer) => string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: "nl-NL",
    isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
    mainEntity: itemListJsonLd(opts.offers, opts.slugOf),
  };
}

/**
 * ItemList of offers, capped at 30. Each entry carries name + image so Google
 * can build a list-style result without re-fetching every detail page.
 */
export function itemListJsonLd(offers: Offer[], slugOf: (o: Offer) => string) {
  return {
    "@type": "ItemList",
    numberOfItems: offers.length,
    itemListElement: offers.slice(0, 30).map((o, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/aanbieding/${slugOf(o)}`,
      name: o.title,
      ...(o.imageUrl ? { image: o.imageUrl } : {}),
    })),
  };
}

/** schema.org FAQPage — drives the "people also ask"-style expandable result. */
export function faqJsonLd(id: string, faq: { q: string; aText: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": id,
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.aText },
    })),
  };
}
