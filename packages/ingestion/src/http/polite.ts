/**
 * How SuperScout talks to a retailer's website: by name, and slowly.
 *
 * Every request any adapter makes goes through here, so the two rules hold
 * everywhere without each adapter remembering them:
 *
 *  - A recognisable User-Agent with a way to reach us. Adapters used to pose
 *    as the AH app ("Appie/9.39") or an iPhone; a retailer who wants to know
 *    who is reading its offers, or ask us to stop, could not tell.
 *  - At most one request every few seconds per host. Dirk's eighteen
 *    department calls used to go out back to back.
 *
 * The throttle is per host, not global: waiting three seconds between Dirk and
 * Jumbo would only make the run slower without being kinder to anyone.
 */

export const HONEST_USER_AGENT = "Mozilla/5.0 (compatible; SuperScoutBot/1.0; +https://superscout.nl/ethiek)";

/** Minimum gap between two requests to the same host. */
export const DEFAULT_INTERVAL_MS = Number(process.env.POLITE_INTERVAL_MS ?? 3000);

export class HostThrottle {
  private readonly next = new Map<string, number>();

  constructor(
    private readonly intervalMs = DEFAULT_INTERVAL_MS,
    private readonly now: () => number = () => Date.now(),
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  /** Resolves when a request to `host` may go out, and books the slot after it. */
  async wait(host: string): Promise<void> {
    const at = this.now();
    const slot = Math.max(at, this.next.get(host) ?? 0);
    // Book before sleeping, so concurrent callers queue instead of colliding.
    this.next.set(host, slot + this.intervalMs);
    if (slot > at) await this.sleep(slot - at);
  }
}

/** One throttle for the whole process: every adapter shares the per-host clock. */
export const sharedThrottle = new HostThrottle();

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * `fetch`, but polite. Overrides any User-Agent an adapter sets — the point is
 * that none of them can pose as something else — and waits its turn per host.
 */
export function politeFetch(
  throttle: HostThrottle = sharedThrottle,
  inner: Fetch = (url, init) => fetch(url, init),
): Fetch {
  return async (url, init = {}) => {
    await throttle.wait(new URL(url).host);
    const headers = new Headers(init.headers);
    headers.set("user-agent", HONEST_USER_AGENT);
    return inner(url, { ...init, headers });
  };
}

/** The process-wide polite fetch. */
export const polite: Fetch = politeFetch();
