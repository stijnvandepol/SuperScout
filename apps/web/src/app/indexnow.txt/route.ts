/**
 * IndexNow ownership proof.
 *
 * IndexNow lets us push changed URLs to Bing, Yandex, Seznam and Naver instead
 * of waiting to be crawled — hours instead of weeks for a domain with no
 * inbound links. (Google does not participate, and retired its own sitemap
 * ping in 2023, so there is no equivalent push for Google; Search Console is
 * the lever there.)
 *
 * The spec allows hosting the key anywhere as long as submissions pass a
 * matching `keyLocation`, which is why this lives at a fixed path rather than
 * at `/<key>.txt`.
 */
export const dynamic = "force-static";

export function GET() {
  const key = process.env.INDEXNOW_KEY;
  // Serving an empty body would make every submission fail validation with a
  // 200, which is far harder to debug than a plain 404.
  if (!key) return new Response("Not found", { status: 404 });

  return new Response(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
