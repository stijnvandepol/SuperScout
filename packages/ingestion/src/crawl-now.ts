/** Ad-hoc full crawl for verification. Uses the real runners, not probes. */
import { crawlAhAssortment, crawlJumboAssortment } from "./assortment-runner";
import { SqliteProductStore } from "./store/sqlite-product-store";

const store = new SqliteProductStore(process.argv[2]!);
const jumboLimit = Number(process.argv[3] ?? 0) || undefined;

const ah = await crawlAhAssortment(store, { onProgress: (l) => console.log(l) });
console.log(`\nAH: ${ah.products} producten, ${ah.aislesFailed} aisles gefaald, ${(ah.durationMs / 1000).toFixed(0)}s\n`);

const jb = await crawlJumboAssortment(store, {
  onProgress: (l) => console.log(l),
  limit: jumboLimit,
});
console.log(`Jumbo: ${jb.products} producten, ${jb.aislesFailed} gefaald, ${(jb.durationMs / 1000).toFixed(0)}s`);

console.log(`\ntotaal in db: ah=${await store.count("ah")} jumbo=${await store.count("jumbo")}`);
await store.close();
