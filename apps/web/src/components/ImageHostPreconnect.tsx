import { preconnect } from "react-dom";
import type { CardOffer } from "@superscout/core";

/**
 * Open connections to the image hosts serving the top of the page.
 *
 * Every product image comes from the chain's own CDN — ten distinct origins
 * across the set (static.ah.nl, s7g10.scene7.com, web-fileserver.dirk.nl,
 * images.ctfassets.net and so on). The browser only learns it needs one when
 * the parser reaches the `<img>`, and then still has DNS, TCP and TLS to do
 * before a single pixel is in flight — a few hundred milliseconds on mobile,
 * spent on the critical path of the Largest Contentful Paint.
 *
 * Deliberately capped: each preconnect holds a socket open, so this covers only
 * the handful of hosts behind the first cards. Preconnecting to all ten would
 * trade an LCP win for contention on everything else.
 */
const MAX_HOSTS = 3;

/** How many leading cards to consider "above the fold" for host discovery. */
const LOOKAHEAD = 8;

export function ImageHostPreconnect({ offers }: { offers: CardOffer[] }) {
  const hosts: string[] = [];

  for (const offer of offers.slice(0, LOOKAHEAD)) {
    if (!offer.imageUrl) continue;
    let origin: string;
    try {
      origin = new URL(offer.imageUrl).origin;
    } catch {
      continue; // A malformed image URL is not worth failing a render over.
    }
    if (!hosts.includes(origin)) hosts.push(origin);
    if (hosts.length >= MAX_HOSTS) break;
  }

  // No crossOrigin: plain <img> requests are not CORS, and declaring it would
  // open a second, unused connection instead of the one the images reuse.
  for (const host of hosts) preconnect(host);

  return null;
}
