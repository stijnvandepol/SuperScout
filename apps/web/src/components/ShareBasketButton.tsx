"use client";

import { useState } from "react";
import { encodeList } from "@/lib/list";

/** Shares the basket as a /lijst link — native share sheet on mobile, clipboard fallback. */
export function ShareBasketButton({ ids }: { ids: string[] }) {
  const [state, setState] = useState<"idle" | "copied">("idle");

  const share = async () => {
    const url = `${window.location.origin}/lijst?i=${encodeURIComponent(encodeList(ids))}`;
    const data = {
      title: "Mijn boodschappenlijst",
      text: "Mijn boodschappenlijst — wat te halen bij welke supermarkt:",
      url,
    };
    // Web Share API (mobile) first; fall back to copying the link.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      setTimeout(() => setState("idle"), 2200);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      disabled={ids.length === 0}
      className="inline-flex items-center gap-1.5 rounded-full bg-deal px-4 py-2.5 font-display text-sm font-bold text-deal-ink shadow-sm transition-transform hover:scale-[1.03] disabled:opacity-40"
    >
      {state === "copied" ? (
        "Link gekopieerd ✓"
      ) : (
        <>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" strokeLinecap="round" />
          </svg>
          Deel als lijst
        </>
      )}
    </button>
  );
}
