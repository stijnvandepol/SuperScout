/**
 * robots.txt, as RFC 9309 describes it.
 *
 * SuperScout reads retailers' websites; the least it owes them is to honour
 * the one machine-readable statement of what they allow. Every URL an adapter
 * needs is checked before the adapter runs, against the rules for our own
 * product token first and the "*" group otherwise. A chain whose robots.txt
 * forbids what we fetch is skipped — with the reason in the ingest status —
 * rather than read anyway.
 */

/** Our product token, as it appears in a robots.txt `User-agent` line. */
export const BOT_TOKEN = "superscoutbot";

interface Rule {
  allow: boolean;
  pattern: string;
}

interface Group {
  agents: string[];
  rules: Rule[];
}

/** Parse into groups. Unknown lines (Sitemap, Crawl-delay, junk) are ignored. */
export function parseRobots(text: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (key === "user-agent") {
      // Consecutive User-agent lines share one group.
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      // An empty Disallow means "nothing is disallowed" — no rule at all.
      if (value) current.rules.push({ allow: key === "allow", pattern: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

/** Does a robots.txt pattern (with `*` and a trailing `$`) match this path? */
function patternMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const regex = body
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${regex}${anchored ? "$" : ""}`).test(path);
}

/**
 * Whether `url` may be fetched under this robots.txt.
 *
 * Group selection: the groups naming our token (merged), else the "*" groups
 * (merged), else everything is allowed. Rule selection: the longest matching
 * pattern wins; on a tie, Allow wins. Both straight from RFC 9309 §2.2.
 */
export function isAllowed(robotsText: string, url: string, token = BOT_TOKEN): boolean {
  const groups = parseRobots(robotsText);
  const own = groups.filter((g) => g.agents.includes(token));
  const selected = own.length > 0 ? own : groups.filter((g) => g.agents.includes("*"));
  const rules = selected.flatMap((g) => g.rules);
  if (rules.length === 0) return true;

  const { pathname, search } = new URL(url);
  const path = decodeURIComponent(pathname) + search;
  if (path === "/robots.txt") return true;

  let best: Rule | null = null;
  for (const rule of rules) {
    if (!patternMatches(rule.pattern, path)) continue;
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow)
    ) {
      best = rule;
    }
  }
  return best ? best.allow : true;
}

/** What we know about one origin's robots.txt. */
export interface RobotsEntry {
  fetchedAt: string;
  /** HTTP status, or 0 when the request itself failed. */
  status: number;
  body: string;
}

export type RobotsFetcher = (url: string) => Promise<{ status: number; body: string }>;

/** A cached copy older than this is not trusted when the live one is unreachable. */
const MAX_CACHE_AGE_DAYS = 30;

/**
 * Resolves robots.txt per origin, once per run, with a last-known-good cache.
 *
 * RFC 9309 on failures: a 4xx means "no robots.txt", so everything is
 * allowed; a 5xx or an unreachable server means "assume everything is
 * disallowed". A single network hiccup at 06:00 should not take a chain off
 * the site for a day, so an unreachable origin falls back to the copy we last
 * read successfully — for at most a month.
 */
export class RobotsPolicy {
  private readonly live = new Map<string, Promise<RobotsEntry>>();

  constructor(
    private readonly fetcher: RobotsFetcher,
    private readonly cache: Record<string, RobotsEntry> = {},
    private readonly now: () => number = () => Date.now(),
  ) {}

  /** The cache after this run, for persisting. */
  snapshot(): Record<string, RobotsEntry> {
    return { ...this.cache };
  }

  private entry(origin: string): Promise<RobotsEntry> {
    let pending = this.live.get(origin);
    if (!pending) {
      pending = this.fetcher(`${origin}/robots.txt`)
        .then((res) => ({ fetchedAt: new Date(this.now()).toISOString(), status: res.status, body: res.body }))
        .catch(() => ({ fetchedAt: new Date(this.now()).toISOString(), status: 0, body: "" }))
        .then((fresh) => {
          const usable = (fresh.status >= 200 && fresh.status < 300) || (fresh.status >= 400 && fresh.status < 500);
          if (usable) {
            this.cache[origin] = fresh;
            return fresh;
          }
          const cached = this.cache[origin];
          const age = cached ? (this.now() - Date.parse(cached.fetchedAt)) / 86_400_000 : Infinity;
          return cached && age <= MAX_CACHE_AGE_DAYS ? cached : fresh;
        });
      this.live.set(origin, pending);
    }
    return pending;
  }

  /** null when allowed, otherwise a Dutch reason fit for the ingest status. */
  async check(url: string): Promise<string | null> {
    const origin = new URL(url).origin;
    const entry = await this.entry(origin);
    if (entry.status >= 400 && entry.status < 500) return null;
    if (entry.status === 0 || entry.status >= 500) {
      return `robots.txt van ${new URL(url).host} onbereikbaar en geen recente kopie — volgens RFC 9309 dan niet ophalen`;
    }
    return isAllowed(entry.body, url) ? null : `robots.txt van ${new URL(url).host} staat ${new URL(url).pathname} niet toe`;
  }

  /** The first reason any of `urls` may not be fetched, or null. */
  async checkAll(urls: readonly string[]): Promise<string | null> {
    for (const url of urls) {
      const reason = await this.check(url);
      if (reason) return reason;
    }
    return null;
  }
}
