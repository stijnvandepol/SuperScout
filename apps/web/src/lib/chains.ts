import type { SupermarketSlug } from "@superscout/core";
import { INGESTED_SUPERMARKETS } from "@superscout/core";
import { getOffers } from "@/lib/offers";
import { STORE_META } from "@/lib/format";

/**
 * Which chains the site can actually show today.
 *
 * The chain list used to be a hardcoded "tien supermarkten" repeated across the
 * site-wide meta description, the OG image, the RSS feed, two FAQ answers and
 * the homepage's FAQPage structured data. Then four adapters stopped producing
 * — Dirk, Lidl, PLUS and DekaMarkt — and every one of those claims silently
 * became false, including the structured data, which Google treats as a
 * misrepresentation rather than a stale sentence.
 *
 * The ingestion worker writes only what it successfully fetched, so absence
 * from the live file *is* the health signal: a chain with no offers is a chain
 * whose adapter failed. Deriving the copy from the data means the site can no
 * longer promise something it is not delivering, and a broken adapter shows up
 * as a shorter sentence instead of as a lie.
 */

export interface LiveChain {
  slug: SupermarketSlug;
  name: string;
  count: number;
  /** Newest ingestion timestamp for this chain, ISO 8601. */
  fetchedAt: string;
}

/** Every chain with offers right now, alphabetically by display name. */
export function liveChains(): LiveChain[] {
  const byChain = new Map<SupermarketSlug, { count: number; fetchedAt: string }>();

  for (const offer of getOffers()) {
    const seen = byChain.get(offer.source);
    if (seen) {
      seen.count += 1;
      if (offer.fetchedAt > seen.fetchedAt) seen.fetchedAt = offer.fetchedAt;
    } else {
      byChain.set(offer.source, { count: 1, fetchedAt: offer.fetchedAt });
    }
  }

  return [...byChain.entries()]
    .filter(([slug]) => slug in STORE_META)
    .map(([slug, v]) => ({
      slug,
      name: STORE_META[slug].name,
      count: v.count,
      fetchedAt: v.fetchedAt,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

/**
 * Chains SuperScout supports but has no data for right now.
 *
 * Exposed rather than hidden: telling a visitor "Dirk doet even niet mee" is
 * worth more than letting them wonder why their supermarket is absent, and it
 * is the only place a failing adapter becomes visible without server access.
 */
export function missingChains(): { slug: SupermarketSlug; name: string }[] {
  const live = new Set(liveChains().map((c) => c.slug));
  // Only chains we actually ingest: a slug with no adapter was never promised,
  // so calling it "temporarily unavailable" would be its own false claim.
  return INGESTED_SUPERMARKETS.filter((slug) => !live.has(slug) && slug in STORE_META)
    .map((slug) => ({ slug, name: STORE_META[slug].name }))
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));
}

/**
 * The chains as Dutch prose: "Albert Heijn, Jumbo en Sligro".
 *
 * Capped because a sentence naming fourteen chains stops being readable; past
 * the cap it falls back to a count, which stays true however the list moves.
 */
export function dutchList(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(", ")} en ${names.at(-1)}`;
}

export function chainSentence(max = 10): string {
  const names = liveChains().map((c) => c.name);
  if (names.length === 0) return "de grote Nederlandse supermarkten";
  if (names.length > max) return `${names.length} Nederlandse supermarkten`;
  return dutchList(names);
}

/** "zes supermarkten" — spelled out up to twelve, as Dutch prose expects. */
const DUTCH_NUMBERS = [
  "nul",
  "één",
  "twee",
  "drie",
  "vier",
  "vijf",
  "zes",
  "zeven",
  "acht",
  "negen",
  "tien",
  "elf",
  "twaalf",
];

export function chainCountWord(): string {
  const n = liveChains().length;
  return DUTCH_NUMBERS[n] ?? String(n);
}

export function chainCount(): number {
  return liveChains().length;
}
