/**
 * Summarise the newest capture of one chain, for reading in a CI log.
 *
 *   docker exec -i -e SLUG=janlinders superscout-ingestion \
 *     node --input-type=module - < packages/ingestion/scripts/capture-report.mjs
 *
 * A capture is a directory of files on the server; the person building the
 * module usually is not on that server. This prints what is needed to choose a
 * source (README step 3): every JSON endpoint the page called with an outline
 * of its shape, arrays that look like products with a sample item, the data
 * blobs embedded in the page, and the markup around the first visible prices.
 * Plain Node, no imports from the bundle, so it runs from stdin in the worker
 * container — and reads only what is on disk, so it can be re-run without
 * visiting the site again.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const slug = process.env.SLUG;
const root = join(process.env.CAPTURE_DIR ?? "/data/captures", slug ?? "");
if (!slug || !existsSync(root)) {
  console.log(`[report] geen capture voor ${slug ?? "(geen SLUG)"}`);
  process.exit(0);
}
// The newest capture that got as far as writing its index.
const runs = readdirSync(root)
  .sort()
  .filter((r) => existsSync(join(root, r, "index.json")));
if (!runs.length) {
  console.log(`[report] ${slug}: geen volledige capture (geweigerd of robots.txt?)`);
  process.exit(0);
}
const dir = join(root, runs[runs.length - 1]);
const cut = (s, n) => (s.length > n ? `${s.slice(0, n)} …(+${s.length - n})` : s);
const PRICE_KEY = /price|prijs|amount|euro|cents/i;

const index = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
console.log(`== ${slug}: ${index.url}  (${dir})`);
console.log(`-- ${index.json.length} JSON-responses`);
for (const j of index.json) {
  console.log(`  json-${String(j.n).padStart(2, "0")} ${j.status} ${String(j.bytes).padStart(8)}B ${cut(j.url, 240)}`);
}

/** Key paths down to `depth`, with array lengths: the shape at a glance. */
function outline(value, path = "$", depth = 0, out = []) {
  if (out.length > 45 || depth > 7) return out;
  if (Array.isArray(value)) {
    out.push(`${path} [${value.length}]`);
    if (value.length && typeof value[0] === "object") outline(value[0], `${path}[0]`, depth + 1, out);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (v && typeof v === "object") outline(v, `${path}.${k}`, depth + 1, out);
    }
  }
  return out;
}

/** Arrays of two or more objects whose first item mentions a price. */
function productArrays(value, path = "$", out = [], seen = 0) {
  if (out.length >= 3 || seen > 20000) return out;
  if (Array.isArray(value)) {
    const first = value.find((x) => x && typeof x === "object" && !Array.isArray(x));
    if (value.length >= 2 && first && PRICE_KEY.test(JSON.stringify(first).slice(0, 4000))) {
      const keys = Object.keys(first);
      if (keys.length >= 3) out.push({ path, length: value.length, first });
    }
    value.slice(0, 3).forEach((v, i) => productArrays(v, `${path}[${i}]`, out, seen + 1));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) productArrays(v, `${path}.${k}`, out, seen + 1);
  }
  return out;
}

function describeJson(label, body) {
  const lines = outline(body);
  if (lines.length) console.log(`\n-- ${label} vorm:\n   ${lines.slice(0, 45).join("\n   ")}`);
  for (const hit of productArrays(body)) {
    console.log(`\n-- ${label} ${hit.path}: ${hit.length} items; eerste:`);
    console.log(cut(JSON.stringify(hit.first), 2500));
  }
}

for (const j of index.json) {
  if (j.bytes < 2000) continue;
  try {
    describeJson(`json-${String(j.n).padStart(2, "0")}`, JSON.parse(readFileSync(join(dir, `json-${String(j.n).padStart(2, "0")}.json`), "utf8")));
  } catch {
    // Not JSON after all.
  }
}

const htmlFile = join(dir, "page.html");
if (existsSync(htmlFile)) {
  const html = readFileSync(htmlFile, "utf8");
  console.log(`\n-- page.html: ${html.length} tekens`);

  for (const [, attrs, content] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (content.length < 2000) continue;
    const id = /id="([^"]+)"/.exec(attrs)?.[1] ?? "";
    const type = /type="([^"]+)"/.exec(attrs)?.[1] ?? "";
    const isState = /__NEXT_DATA__|__NUXT|__APOLLO|__INITIAL|__PRELOADED|ld\+json|application\/json/.test(id + type + content.slice(0, 200));
    if (!isState && !PRICE_KEY.test(content.slice(0, 50000))) continue;
    console.log(`\n-- script ${id || type || "(inline)"}: ${content.length} tekens`);
    try {
      describeJson(`script ${id || type}`, JSON.parse(content));
      continue;
    } catch {
      // Executable state (window.__NUXT__=(function(a,b){…})) is not JSON;
      // show where the prices are instead.
    }
    const at = content.search(/"?(?:price|prijs)\w*"?\s*:/i);
    console.log(`   begin: ${cut(content.slice(0, 300), 300)}`);
    if (at >= 0) console.log(`   rond eerste prijs: ${content.slice(Math.max(0, at - 1200), at + 1300)}`);
  }

  // Visible prices: text between tags, after dropping what cannot be a price.
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<svg[\s\S]*?<\/svg>/g, "<svg/>")
    .replace(/data:[^"')\s]+/g, "data:");
  const prices = [...visible.matchAll(/>[^<>]{0,15}\b\d{1,3}[,.]\d{2}\b[^<>]{0,15}</g)];
  const links = new Set(visible.match(/href="[^"]*(?:\/product|\/p\/|\/artikel|\/aanbieding)[^"]*"/g) ?? []);
  console.log(`\n-- zichtbaar: ${prices.length} prijzen, ${links.size} product-/aanbiedingslinks (${[...links].slice(0, 4).join(" ")})`);
  for (const m of [prices[0], prices[Math.floor(prices.length / 2)]].filter(Boolean).slice(0, prices.length > 1 ? 2 : 1)) {
    console.log(`\n-- markup rond ${m[0].trim()}:\n${visible.slice(Math.max(0, m.index - 1500), m.index + 500).replace(/\s+/g, " ")}`);
  }
}

// How the page reaches the rest of its offers: links under the same path
// (pages, weeks, categories, a folder), buttons ("Meer laden", "Volgende week")
// and data-* attributes that point at a URL. Answers "why only 18 of them?".
if (existsSync(htmlFile)) {
  const html = readFileSync(htmlFile, "utf8");
  const base = new URL(index.url);
  const sameSection = new Set();
  for (const [, href] of html.matchAll(/href="([^"#]+)"/g)) {
    try {
      const u = new URL(href.replace(/&amp;/g, "&"), base);
      if (u.host.replace(/^www\./, "") === base.host.replace(/^www\./, "") && u.pathname.startsWith(base.pathname.replace(/\/$/, ""))) {
        sameSection.add(u.pathname + u.search);
      }
    } catch {
      // Not a URL.
    }
  }
  console.log(`\n-- links onder ${base.pathname}: ${sameSection.size}`);
  console.log(`   ${[...sameSection].slice(0, 40).join("\n   ")}`);
  const buttons = new Set(
    [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)]
      .map(([, inner]) => inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      .filter((t) => t && t.length < 60),
  );
  console.log(`-- knoppen: ${[...buttons].slice(0, 30).join(" | ")}`);
  const dataUrls = new Set([...html.matchAll(/data-[\w-]+="(https?:\/\/[^"]+|\/[^"]+)"/g)].map(([, v]) => v).filter((v) => !/\.(png|jpe?g|webp|svg|gif)/i.test(v)));
  console.log(`-- data-url's: ${[...dataUrls].slice(0, 15).join("  ")}`);
}
