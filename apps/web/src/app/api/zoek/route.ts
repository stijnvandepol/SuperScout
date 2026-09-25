import { toCardOffer } from "@superscout/core";
import { byBiggestDiscount, dataFetchedAt, getOffers } from "@/lib/offers";
import { MAX_TERM_LENGTH, normalizeTerm, offerMatches } from "@/lib/search";

// Read at request time, never baked into the build: see `loadRaw` in
// lib/offers.ts for what a build-time prerender contains.
export const dynamic = "force-dynamic";

const MAX_RESULTS = 48;

/**
 * Search the live offers: `/api/zoek?q=koffie`.
 *
 * Exists for the watchlist, which has to answer "what matches my terms right
 * now" on a page that does not carry the whole offer set. Read-only, no
 * personal data, and cheap — a filter over an array already in memory — so it
 * is cached at the edge rather than rate limited.
 */
export function GET(request: Request): Response {
  const raw = new URL(request.url).searchParams.get("q") ?? "";
  if (raw.length > MAX_TERM_LENGTH * 2) return json({ error: "zoekterm te lang" }, 400);

  const q = normalizeTerm(raw);
  if (q.length < 2) return json({ error: "zoekterm te kort" }, 400);

  const matches = byBiggestDiscount(getOffers().filter((o) => offerMatches(o, q)));
  return json(
    { q, total: matches.length, dataDate: dataFetchedAt(), offers: matches.slice(0, MAX_RESULTS).map(toCardOffer) },
    200,
    "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
  );
}

function json(body: unknown, status: number, cache = "no-store"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache,
      "X-Robots-Tag": "noindex",
    },
  });
}
