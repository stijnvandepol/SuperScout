"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CardOffer } from "@superscout/core";
import { OfferCard } from "./OfferCard";
import { track } from "@/lib/analytics";
import {
  getWatchlist,
  markSeen,
  onWatchlistChange,
  unseen,
  unwatchTerm,
  watchTerm,
  type WatchedTerm,
} from "@/lib/watchlist";

interface TermResult {
  term: string;
  total: number;
  offers: CardOffer[];
  dataDate: string | null;
  fresh: Set<string>;
  failed?: boolean;
}

const SUGGESTIONS = ["koffie", "wasmiddel", "luiers", "tandpasta", "kattenvoer", "bier"];

/**
 * The watchlist, resolved against today's offers.
 *
 * "New" is computed before anything is marked seen, then the current matches
 * are recorded — so this page shows the news once, and the homepage banner
 * goes quiet until something else turns up.
 */
export function WatchlistView() {
  const [list, setList] = useState<WatchedTerm[] | null>(null);
  const [results, setResults] = useState<TermResult[]>([]);
  const [nowIso] = useState(() => new Date().toISOString());
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const read = () => setList(getWatchlist());
    read();
    return onWatchlistChange(read);
  }, []);

  const terms = list?.map((t) => t.term).join("|") ?? "";

  useEffect(() => {
    if (!list || list.length === 0) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const snapshot = list;

    void Promise.all(
      snapshot.map(async (entry): Promise<TermResult> => {
        try {
          const res = await fetch(`/api/zoek?q=${encodeURIComponent(entry.term)}`);
          if (!res.ok) throw new Error(String(res.status));
          const body = (await res.json()) as {
            total: number;
            offers: CardOffer[];
            dataDate: string | null;
          };
          const ids = body.offers.map((o) => o.id);
          return {
            term: entry.term,
            total: body.total,
            offers: body.offers,
            dataDate: body.dataDate,
            fresh: new Set(unseen(entry, ids)),
          };
        } catch {
          return { term: entry.term, total: 0, offers: [], dataDate: null, fresh: new Set(), failed: true };
        }
      }),
    ).then((resolved) => {
      if (cancelled) return;
      setResults(resolved);
      const freshCount = resolved.reduce((sum, r) => sum + r.fresh.size, 0);
      track("Volglijst bekeken", { termen: resolved.length, nieuw: freshCount > 0 });
      for (const r of resolved) {
        if (!r.failed) markSeen(r.term, r.offers.map((o) => o.id));
      }
    });

    return () => {
      cancelled = true;
    };
    // Only refetch when the set of terms changes, not when `seen` is updated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terms]);

  if (list === null) return null;

  const addDraft = (term: string) => {
    if (watchTerm(term, [])) {
      track("Volg zoekterm", { term: term.trim().toLowerCase(), bron: "volglijst" });
      setDraft("");
    }
  };

  return (
    <div className="mt-8">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addDraft(draft);
        }}
      >
        <label htmlFor="volg-term" className="sr-only">
          Zoekterm om te volgen
        </label>
        <input
          id="volg-term"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Bijv. koffiebonen, Robijn, luiers maat 4"
          maxLength={60}
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-5 py-3 text-[15px] outline-none focus:border-deal focus:ring-4 focus:ring-deal/20"
        />
        <button
          type="submit"
          disabled={draft.trim().length < 2}
          className="shrink-0 rounded-full bg-ink px-5 py-3 font-display text-sm font-bold text-bg disabled:opacity-40"
        >
          Volg
        </button>
      </form>

      {list.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
          <p className="font-display text-lg">Je volgt nog niets</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            Tik op <strong className="text-ink">Volg</strong> bij een zoekopdracht, of begin met een
            van deze:
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addDraft(s)}
                className="rounded-full border border-line bg-surface px-4 py-2 text-sm hover:border-ink/30"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-10 space-y-14">
          {list.map((entry) => {
            const result = results.find((r) => r.term === entry.term);
            return (
              <section key={entry.term} aria-labelledby={`term-${entry.term}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 id={`term-${entry.term}`} className="font-display text-xl font-bold tracking-tight">
                    “{entry.term}”{" "}
                    {result && result.fresh.size > 0 ? (
                      <span className="ml-1 rounded-md bg-fresh/10 px-2 py-0.5 align-middle font-mono text-xs font-bold text-fresh">
                        {result.fresh.size} nieuw
                      </span>
                    ) : null}
                  </h2>
                  <div className="flex items-center gap-4 font-mono text-xs text-ink-soft">
                    <a
                      href={`/feed.xml?q=${encodeURIComponent(entry.term)}`}
                      className="underline-offset-2 hover:text-ink hover:underline"
                      title="Abonneer je in een RSS-lezer: dan krijg je een melding zonder dat wij iets van je weten"
                    >
                      RSS
                    </a>
                    <Link
                      href={`/?q=${encodeURIComponent(entry.term)}`}
                      className="underline-offset-2 hover:text-ink hover:underline"
                    >
                      Zoek
                    </Link>
                    <button
                      type="button"
                      onClick={() => unwatchTerm(entry.term)}
                      className="underline-offset-2 hover:text-urgent hover:underline"
                    >
                      Stop met volgen
                    </button>
                  </div>
                </div>

                {!result ? (
                  <p className="mt-4 font-mono text-xs text-ink-soft">Laden…</p>
                ) : result.failed ? (
                  <p className="mt-4 text-sm text-ink-soft">
                    Kon de aanbiedingen nu niet ophalen. Probeer het zo nog eens.
                  </p>
                ) : result.offers.length === 0 ? (
                  <p className="mt-4 text-sm text-ink-soft">
                    Deze week niets in de aanbieding. Je ziet het hier zodra dat verandert.
                  </p>
                ) : (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {[...result.offers]
                      .sort((a, b) => Number(result.fresh.has(b.id)) - Number(result.fresh.has(a.id)))
                      .slice(0, 12)
                      .map((o) => (
                        <OfferCard key={o.id} offer={o} nowIso={nowIso} dataDate={result.dataDate} />
                      ))}
                  </div>
                )}
                {result && result.total > 12 ? (
                  <Link
                    href={`/?q=${encodeURIComponent(entry.term)}`}
                    className="mt-4 inline-block font-mono text-xs font-bold underline underline-offset-2"
                  >
                    Alle {result.total} aanbiedingen →
                  </Link>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
