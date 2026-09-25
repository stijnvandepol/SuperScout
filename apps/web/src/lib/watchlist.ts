"use client";

import { normalizeTerm } from "@/lib/search";

/**
 * The watchlist: search terms a visitor wants to hear about again.
 *
 * The retention problem in one sentence: someone finds a good coffee deal,
 * leaves, and has no reason to come back next week. A price alert is the
 * usual answer, and the usual implementation needs an account and an e-mail
 * address — which this site promised not to ask for. So the list lives where
 * the basket already lives, in this browser, and "alert" means the site shows
 * what is new for your terms the moment you return. The RSS feed per term is
 * the push variant for people who want one, still without us knowing who.
 *
 * `seen` holds the offer ids shown last time, so "new" means new *to you*, not
 * new to the site. Capped, because a broad term like "kaas" would otherwise
 * grow the list by a few hundred ids a month.
 */

const KEY = "superscout:volglijst";
const EVENT = "superscout:volglijst";
const MAX_TERMS = 20;
const MAX_SEEN = 300;

export interface WatchedTerm {
  term: string;
  addedAt: string;
  seen: string[];
}

export function getWatchlist(): WatchedTerm[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as WatchedTerm[]) : [];
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t?.term === "string") : [];
  } catch {
    return [];
  }
}

function save(list: WatchedTerm[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Private mode or a full quota: the list simply does not persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function isWatched(term: string): boolean {
  const needle = normalizeTerm(term);
  return getWatchlist().some((t) => t.term === needle);
}

/**
 * Start following a term. `currentIds` are the matches on screen right now:
 * the visitor has just seen those, so they must not come back as "new".
 */
export function watchTerm(term: string, currentIds: string[]): boolean {
  const needle = normalizeTerm(term);
  if (needle.length < 2) return false;
  const list = getWatchlist().filter((t) => t.term !== needle);
  list.unshift({ term: needle, addedAt: new Date().toISOString(), seen: currentIds.slice(0, MAX_SEEN) });
  save(list.slice(0, MAX_TERMS));
  return true;
}

export function unwatchTerm(term: string): void {
  const needle = normalizeTerm(term);
  save(getWatchlist().filter((t) => t.term !== needle));
}

/** Record what the visitor has now seen for a term. */
export function markSeen(term: string, ids: string[]): void {
  const needle = normalizeTerm(term);
  save(
    getWatchlist().map((t) =>
      t.term === needle ? { ...t, seen: [...new Set([...ids, ...t.seen])].slice(0, MAX_SEEN) } : t,
    ),
  );
}

/** Ids among `ids` the visitor has not seen for this term. */
export function unseen(entry: WatchedTerm, ids: string[]): string[] {
  const seen = new Set(entry.seen);
  return ids.filter((id) => !seen.has(id));
}

export function onWatchlistChange(handler: () => void): () => void {
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
