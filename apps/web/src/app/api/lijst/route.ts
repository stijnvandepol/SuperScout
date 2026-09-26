import { toCardOffer } from "@superscout/core";
import { dataFetchedAt } from "@/lib/offers";
import { isListKind, listOffers } from "@/lib/lists";

export const dynamic = "force-dynamic";

const PAGE = 48;

/** The rest of a listing page: `/api/lijst?soort=actie&slug=1-plus-1-gratis&vanaf=48`. */
export function GET(request: Request): Response {
  const params = new URL(request.url).searchParams;
  const kind = params.get("soort") ?? "";
  const slug = (params.get("slug") ?? "").slice(0, 64);
  const from = Number.parseInt(params.get("vanaf") ?? "0", 10);

  if (!isListKind(kind) || !/^[a-z0-9-]+$/.test(slug) || !Number.isFinite(from) || from < 0) {
    return json({ error: "ongeldig verzoek" }, 400);
  }
  const list = listOffers(kind, slug);
  if (!list) return json({ error: "onbekende lijst" }, 404);

  return json(
    {
      total: list.length,
      dataDate: dataFetchedAt(),
      offers: list.slice(from, from + PAGE).map(toCardOffer),
    },
    200,
    "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
  );
}

function json(body: unknown, status: number, cache = "no-store"): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": cache, "X-Robots-Tag": "noindex" },
  });
}
