import type { Offer, SourceAdapter } from "@superscout/core";
import type { RobotsPolicy } from "./robots";
import { SOURCE_URLS } from "./source-urls";

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

/** An error that means "the retailer does not want this", not "something broke". */
export function isBlockError(message: string | undefined): boolean {
  return !!message && /\b(401|403|429)\b|captcha|access denied|too many requests|forbidden|blocked/i.test(message);
}

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

      const urls = SOURCE_URLS[adapter.source];
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

/**
 * Wrap a fetch so that one refusal ends the conversation.
 *
 * The catalogue crawls make hundreds of requests per run, page by page and
 * with retries. Without this, a 403 on the first page would be followed by
 * every remaining page — each one refused, each one a little more like an
 * attempt to get through. After the first 401/403/429 nothing more is sent;
 * the error names the status, so the run is recorded as a refusal.
 */
export function stopOnRefusal<A extends unknown[]>(
  inner: (url: string, ...rest: A) => Promise<Response>,
  state: { refused: number | null },
): (url: string, ...rest: A) => Promise<Response> {
  return async (url, ...rest) => {
    if (state.refused !== null) {
      throw new Error(`eerder in deze run geweigerd (${state.refused}); geen nieuwe verzoeken`);
    }
    const res = await inner(url, ...rest);
    if (res.status === 401 || res.status === 403 || res.status === 429) state.refused = res.status;
    return res;
  };
}
