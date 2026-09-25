"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

/**
 * Share one deal. The native share sheet on phones (where WhatsApp lives),
 * a WhatsApp link as the fallback, and copying the link as the last resort.
 *
 * The shared text carries the price and the store, because a link preview in
 * a group chat is often all anybody reads.
 */
export function ShareOfferButton({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    track("Aanbieding gedeeld", { via: "knop" });
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch {
        // Cancelled, or the platform refused — fall through to WhatsApp.
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* ignore */
    }
  };

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={share}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2.5 font-display text-sm font-bold transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deal"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" strokeLinecap="round" />
        </svg>
        {copied ? "Link gekopieerd ✓" : "Delen"}
      </button>
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("Aanbieding gedeeld", { via: "whatsapp" })}
        className="inline-flex items-center rounded-full border border-line px-4 py-2.5 font-display text-sm font-bold transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deal"
      >
        WhatsApp
      </a>
    </div>
  );
}
