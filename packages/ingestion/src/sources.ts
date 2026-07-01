import type { SourceAdapter } from "@superscout/core";
import { DirkAdapter } from "./adapters/dirk/dirk.adapter";
import { JumboAdapter } from "./adapters/jumbo/jumbo.adapter";
import { AhAdapter } from "./adapters/ah/ah.adapter";
import { PlusAdapter } from "./adapters/plus/plus.adapter";

/**
 * The supermarket plugin registry. Adding a chain = add one entry here; the
 * ingestion worker picks it up automatically. `live` marks the sources that
 * are safe to run unattended today (no auth / no fragile harvesting).
 */
export interface SourcePlugin {
  slug: string;
  label: string;
  live: boolean;
  create: () => SourceAdapter;
}

export const SOURCE_PLUGINS: readonly SourcePlugin[] = [
  { slug: "dirk", label: "Dirk", live: true, create: () => new DirkAdapter() },
  { slug: "jumbo", label: "Jumbo", live: true, create: () => new JumboAdapter() },
  { slug: "ah", label: "Albert Heijn", live: true, create: () => new AhAdapter() },
  // Plus (OutSystems csrf/moduleVersion harvest) stays off until verified live.
  { slug: "plus", label: "Plus", live: false, create: () => new PlusAdapter() },
];

/** Adapters safe to run unattended right now. */
export function liveAdapters(): SourceAdapter[] {
  return SOURCE_PLUGINS.filter((p) => p.live).map((p) => p.create());
}
