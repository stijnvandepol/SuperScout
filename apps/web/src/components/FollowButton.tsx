"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { isWatched, onWatchlistChange, unwatchTerm, watchTerm } from "@/lib/watchlist";

/**
 * "Volg deze zoekterm" — the account-free price alert.
 *
 * The ids on screen are stored as already seen, so the first thing the
 * visitor hears back is genuinely new, not the list they were just reading.
 */
export function FollowButton({ term, matchIds }: { term: string; matchIds: string[] }) {
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    const read = () => setWatching(isWatched(term));
    read();
    return onWatchlistChange(read);
  }, [term]);

  return (
    <button
      type="button"
      aria-pressed={watching}
      onClick={() => {
        if (watching) {
          unwatchTerm(term);
          return;
        }
        if (watchTerm(term, matchIds)) track("Volg zoekterm", { term });
      }}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deal ${
        watching ? "bg-fresh/10 text-fresh" : "border border-line bg-surface text-ink hover:border-ink/40"
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinejoin="round" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
      </svg>
      {watching ? `Je volgt “${term}”` : `Volg “${term}”`}
    </button>
  );
}
