/**
 * Summarise the newest capture of one chain, for reading in a CI log.
 *
 *   docker exec -i -e SLUG=janlinders superscout-ingestion \
 *     node --input-type=module - < packages/ingestion/scripts/capture-report.mjs
 *
 * A capture is a directory of files on the server; the person building the
 * module usually is not on that server. This prints what is needed to choose a
 * source (README step 3): every JSON endpoint the page called, the arrays that
 * look like an offer list with two sample items, and for the HTML the embedded
 * data blobs and the markup around the first prices. Plain Node, no imports
 * from the bundle, so it runs from stdin in the worker container.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const slug = process.env.SLUG;
const root = join(process.env.CAPTURE_DIR ?? "/data/captures", slug ?? "");
if (!slug || !existsSync(root)) {
  console.log(`[report] geen capture voor ${slug ?? "(geen SLUG)"}`);
  process.exit(0);
}
const runs = readdirSync(root).sort();
const dir = join(root, runs[runs.length - 1]);
const cut = (s, n) => (s.length > n ? `${s.slice(0, n)} …(+${s.length - n})` : s);

let index = { url: "?", json: [] };
try {
  index = JSON.parse(readFileSync(join(dir, "index.json"), "utf8"));
} catch {
  console.log(`[report] ${dir}: geen index.json (capture afgebroken?)`);
}
console.log(`== ${slug}: ${index.url}  (${dir})`);
console.log(`-- ${index.json.length} JSON-responses`);
for (const j of index.json) {
  const mark = j.hints.length ? "*" : " ";
  console.log(`${mark} json-${String(j.n).padStart(2, "0")} ${j.status} ${String(j.bytes).padStart(8)}B ${cut(j.url, 220)}`);
}

/** Resolve a hint path like `$.data.items[0].products` against a body. */
function at(body, path) {
  let cur = body;
  for (const [, key, idx] of path.slice(1).matchAll(/\.([^.[]+)|\[(\d+)\]/g)) {
    if (cur == null) return undefined;
    cur = key !== undefined ? cur[key] : cur[Number(idx)];
  }
  return cur;
}

for (const j of index.json.filter((x) => x.hints.length).slice(0, 4)) {
  const file = join(dir, `json-${String(j.n).padStart(2, "0")}.json`);
  let body;
  try {
    body = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    continue;
  }
  for (const hint of j.hints.slice(0, 2)) {
    const path = hint.split(" ")[0];
    const list = at(body, path);
    if (!Array.isArray(list)) continue;
    console.log(`\n-- json-${String(j.n).padStart(2, "0")} ${path}: ${list.length} items; eerste twee:`);
    for (const item of list.slice(0, 2)) console.log(cut(JSON.stringify(item, null, 1), 3500));
  }
}

const htmlFile = join(dir, "page.html");
if (existsSync(htmlFile)) {
  const html = readFileSync(htmlFile, "utf8");
  console.log(`\n-- page.html: ${html.length} tekens`);
  for (const id of ["__NEXT_DATA__", "__NUXT_DATA__", "__NUXT__", "__APOLLO_STATE__", "__INITIAL_STATE__"]) {
    const i = html.indexOf(id);
    if (i >= 0) console.log(`   bevat ${id} (op ${i})`);
  }
  const ld = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)];
  if (ld.length) {
    console.log(`   ${ld.length}× ld+json; eerste: ${cut(ld[0][1].trim(), 1500)}`);
  }
  const productLinks = new Set(html.match(/href="[^"]*(?:\/product|\/p\/|\/artikel|\/aanbieding)[^"]*"/g) ?? []);
  console.log(`   ${productLinks.size} unieke product-/aanbiedingslinks; voorbeelden: ${[...productLinks].slice(0, 4).join(" ")}`);
  const body = html.indexOf("<body");
  const prices = [...html.slice(Math.max(body, 0)).matchAll(/(?:€\s?|&euro;\s?)?\b\d{1,3}[,.]\d{2}\b/g)];
  console.log(`   ${prices.length} prijsachtige getallen in de body`);
  for (const m of prices.filter((_, i) => i === 0 || i === Math.floor(prices.length / 2)).slice(0, 2)) {
    const pos = Math.max(body, 0) + m.index;
    console.log(`\n-- markup rond "${m[0]}":\n${html.slice(Math.max(0, pos - 900), pos + 400).replace(/\s+/g, " ")}`);
  }
}
