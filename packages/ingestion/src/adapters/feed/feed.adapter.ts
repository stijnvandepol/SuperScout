import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Offer, SourceAdapter, SupermarketSlug } from "@superscout/core";
import { isRetailerSlug } from "@superscout/core";
import { normalizeFeed } from "./feed.normalize";

/**
 * One feed file as a source.
 *
 * One adapter per file rather than one for the directory, so the runner's
 * per-source isolation applies: a malformed Kruidvat file fails Kruidvat and
 * nothing else, and shows up by name in the ingest report.
 */
export class FeedFileAdapter implements SourceAdapter {
  constructor(
    readonly source: SupermarketSlug,
    private readonly path: string,
    private readonly clock: () => string = () => new Date().toISOString(),
    private readonly read: (path: string) => string = (p) => readFileSync(p, "utf-8"),
    private readonly log: (line: string) => void = (line) => console.warn(line),
  ) {}

  async fetchOffers(): Promise<Offer[]> {
    const raw = JSON.parse(this.read(this.path)) as unknown;
    const result = normalizeFeed(raw, { nowIso: this.clock(), expectedRetailer: this.source });
    // Reported, not thrown: a dropped row is the validator doing its job.
    for (const issue of result.issues.slice(0, 20)) this.log(`[feed] ${this.source}: ${issue}`);
    if (result.issues.length > 20) {
      this.log(`[feed] ${this.source}: … en nog ${result.issues.length - 20} meldingen`);
    }
    return result.offers;
  }
}

/**
 * Every `<retailer>[.<label>].json` in `dir`, as adapters.
 *
 * The retailer is read from the file name so the adapter knows its source
 * before opening the file — the runner needs it for the report even when the
 * file turns out to be unreadable. Several files per retailer are allowed
 * ("kruidvat.week41.json", "kruidvat.handmatig.json"); files whose prefix is
 * not a known retailer are skipped with a warning instead of failing the run.
 */
export function feedAdapters(
  dir: string | undefined,
  log: (line: string) => void = (line) => console.warn(line),
): SourceAdapter[] {
  if (!dir) return [];

  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    // No feeds directory is the normal state until the first file is added.
    return [];
  }

  const adapters: SourceAdapter[] = [];
  for (const name of names.filter((n) => n.endsWith(".json")).sort()) {
    const prefix = name.split(".")[0] ?? "";
    if (!isRetailerSlug(prefix)) {
      log(`[feed] ${name}: bestandsnaam begint niet met een bekende retailer, overgeslagen`);
      continue;
    }
    adapters.push(new FeedFileAdapter(prefix, join(dir, name)));
  }
  return adapters;
}
