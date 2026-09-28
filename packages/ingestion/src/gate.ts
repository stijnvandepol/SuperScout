import type { Offer, SourceAdapter } from "@superscout/core";
import type { RobotsPolicy } from "./robots";
import { moduleFor } from "./retailers";

export { isBlockError, stopOnRefusal } from "./http/refusal";

/**
 * Which adapters may run today, and why the others may not.
 *
 * Two reasons to leave a chain alone:
 *  - its robots.txt forbids a URL the adapter needs;
 *  - it refused us recently (401/403/429, a captcha). Asking again the next
 *    morning, and the one after, is exactly the persistence a retailer reads
 *    as circumvention. We wait `BLOCK_BACKOFF_DAYS` and then try once.
 *
 * A gated adapter is replaced by one that fails with the reason, so the chain
 * still appears in the report — as "not fetched, because", never as silence.
 */

export const BLOCK_BACKOFF_DAYS = 7;

export type RobotsMode = "enforce" | "report";

class SkippedAdapter implements SourceAdapter {
  constructor(
    readonly source: SourceAdapter["source"],
    private readonly reason: string,
  ) {}
  async fetchOffers(): Promise<Offer[]> {
    throw new Error(this.reason);
  }
}

export interface GateResult {
  adapters: SourceAdapter[];
  /** Robots findings in "report" mode, which do not stop the adapter. */
  warnings: Record<string, string>;
}

export async function gateAdapters(
  adapters: SourceAdapter[],
  opts: {
    robots: RobotsPolicy;
    mode: RobotsMode;
    /** Source -> ISO date it last refused us, from the previous run's status. */
    blockedSince: Record<string, string>;
    now: number;
    /** URLs a source requests; defaults to the retailer module's own list. */
    urlsFor?: (source: string) => readonly string[] | undefined;
  },
): Promise<GateResult> {
  const warnings: Record<string, string> = {};
  const gated = await Promise.all(
    adapters.map(async (adapter) => {
      const since = opts.blockedSince[adapter.source];
      if (since) {
        const days = (opts.now - Date.parse(since)) / 86_400_000;
        if (days < BLOCK_BACKOFF_DAYS) {
          const retry = new Date(Date.parse(since) + BLOCK_BACKOFF_DAYS * 86_400_000).toISOString().slice(0, 10);
          return new SkippedAdapter(adapter.source, `geweigerd door de winkel op ${since.slice(0, 10)}; volgende poging op ${retry}`);
        }
      }

      const urls = (opts.urlsFor ?? ((source: string) => moduleFor(source)?.urls))(adapter.source);
      if (!urls) return adapter; // feeds: no retailer website involved
      const reason = await opts.robots.checkAll(urls);
      if (!reason) return adapter;
      if (opts.mode === "report") {
        warnings[adapter.source] = reason;
        return adapter;
      }
      return new SkippedAdapter(adapter.source, reason);
    }),
  );
  return { adapters: gated, warnings };
}
