import { getArchivedOffers, getOffers } from "@/lib/offers";
import { parseReport, RateLimiter, storeReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

const limiter = new RateLimiter(5, 10 * 60_000);

/** Report a wrong or outdated offer. See lib/reports.ts for what is (not) kept. */
export async function POST(request: Request): Promise<Response> {
  // Only from our own pages. Not a security boundary on its own, but it stops
  // the form being posted to from elsewhere and keeps drive-by spam out.
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host || hostOf(origin) !== host) {
    return reply({ error: "verzoek niet toegestaan" }, 403);
  }

  const client =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "onbekend";
  if (!limiter.allow(client)) {
    return reply({ error: "Je hebt net al een paar meldingen gedaan. Probeer het later nog eens." }, 429);
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 4_096) return reply({ error: "verzoek te groot" }, 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return reply({ error: "ongeldig verzoek" }, 400);
  }

  const known = (id: string) =>
    getOffers().some((o) => o.id === id) || getArchivedOffers().some((o) => o.id === id);
  const report = parseReport(body, known, new Date());
  if (typeof report === "string") return reply({ error: report }, 400);

  storeReport(report);
  return reply({ ok: true }, 202);
}

/** A browser may send the literal string "null" as its origin; that is no host. */
function hostOf(origin: string): string | null {
  try {
    return new URL(origin).host;
  } catch {
    return null;
  }
}

function reply(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
