import type { SourceAdapter } from "@superscout/core";
import { DirkAdapter } from "./adapters/dirk/dirk.adapter";
import { JumboAdapter } from "./adapters/jumbo/jumbo.adapter";
import { AhAdapter } from "./adapters/ah/ah.adapter";

/**
 * Chains fetched directly from their own API (no browser needed) — the robust,
 * fast path. Browser-driven chains live in browser/browser-sources.ts.
 * Adding an API chain = one line here.
 */
export function apiAdapters(): SourceAdapter[] {
  return [new DirkAdapter(), new JumboAdapter(), new AhAdapter()];
}
