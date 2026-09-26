import { health } from "@/lib/health";

export const dynamic = "force-dynamic";

/**
 * For an uptime monitor (UptimeRobot, Better Stack, a cron with curl): 200
 * when the site's data can be trusted, 503 when it cannot. Contains nothing
 * sensitive — counts, ages and chain slugs — so it needs no auth.
 */
export function GET(): Response {
  const report = health();
  return new Response(JSON.stringify(report), {
    status: report.ok ? 200 : 503,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
