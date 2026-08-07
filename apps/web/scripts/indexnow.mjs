#!/usr/bin/env node
/**
 * Push every sitemap URL to IndexNow (Bing, Yandex, Seznam, Naver).
 *
 * Reads the live sitemap rather than the local offer file so it can only ever
 * submit URLs that are actually served — submitting a 404 counts against the
 * host's reputation with the endpoint.
 *
 *   INDEXNOW_KEY=<key> node apps/web/scripts/indexnow.mjs
 *
 * Safe to run on every deploy: the endpoint is idempotent and rate-limits by
 * host, not by request count.
 */

const SITE_URL = process.env.SITE_URL ?? "https://superscout.nl";
const KEY = process.env.INDEXNOW_KEY;
const ENDPOINT = "https://api.indexnow.org/IndexNow";
// The spec caps a single submission at 10 000 URLs.
const BATCH_SIZE = 10_000;

if (!KEY) {
  console.error("INDEXNOW_KEY is not set — skipping submission.");
  process.exit(0);
}

const host = new URL(SITE_URL).host;

async function sitemapUrls() {
  const res = await fetch(`${SITE_URL}/sitemap.xml`, {
    headers: { "User-Agent": "SuperScout-IndexNow/1.0" },
  });
  if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`);

  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) =>
    // Sitemaps carry XML-escaped entities; IndexNow wants the real URL.
    loc
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim(),
  );

  if (urls.length === 0) throw new Error("sitemap.xml contained no <loc> entries");
  return urls;
}

async function submit(batch) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: KEY,
      keyLocation: `${SITE_URL}/indexnow.txt`,
      urlList: batch,
    }),
  });

  // 200 = accepted, 202 = accepted but key still being verified. Both fine.
  if (res.status !== 200 && res.status !== 202) {
    throw new Error(`IndexNow returned ${res.status}: ${await res.text()}`);
  }
  return res.status;
}

const urls = await sitemapUrls();
console.log(`Submitting ${urls.length} URLs for ${host}…`);

for (let i = 0; i < urls.length; i += BATCH_SIZE) {
  const batch = urls.slice(i, i + BATCH_SIZE);
  const status = await submit(batch);
  console.log(`  batch ${i / BATCH_SIZE + 1}: ${batch.length} URLs → HTTP ${status}`);
}

console.log("Done.");
