"use client";

import { useState } from "react";
import type { Offer, SupermarketSlug } from "@superscout/core";
import { formatEuro, STORE_META } from "@/lib/format";

/** Build a clean, WhatsApp-friendly text version of the basket, grouped per store. */
export function formatBasketText(offers: Offer[]): string {
  const groups = new Map<SupermarketSlug, Offer[]>();
  for (const o of offers) {
    const g = groups.get(o.source) ?? [];
    g.push(o);
    groups.set(o.source, g);
  }

  const lines: string[] = ["🧾 Boodschappenlijst", ""];
  let total = 0;
  for (const [source, list] of groups) {
    lines.push(`🛒 ${STORE_META[source].name}`);
    for (const o of list) {
      const price =
        o.pricing.currentPriceCents !== null
          ? formatEuro(o.pricing.currentPriceCents)
          : (o.rawLabel ?? "actie");
      lines.push(`• ${o.title} — ${price}`);
      total += o.pricing.currentPriceCents ?? 0;
    }
    lines.push("");
  }
  lines.push(`💶 Totaal (indicatief): ${formatEuro(total)}`);
  lines.push("");
  lines.push("Gevonden op SuperScout · superscout.nl");
  return lines.join("\n");
}

/** Shares the basket as formatted text — native share sheet on mobile, clipboard fallback. */
export function ShareBasketButton({ offers }: { offers: Offer[] }) {
  const [state, setState] = useState<"idle" | "copied">("idle");

  const share = async () => {
    const text = formatBasketText(offers);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Mijn boodschappenlijst", text });
        return;
      } catch {
        // cancelled or unsupported — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
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
      disabled={offers.length === 0}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-deal px-4 py-2.5 font-display text-sm font-bold text-deal-ink shadow-sm transition-transform hover:scale-[1.03] disabled:opacity-40"
    >
      {state === "copied" ? (
        "Lijst gekopieerd ✓"
      ) : (
        <>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" strokeLinecap="round" />
          </svg>
          Deel lijst
        </>
      )}
    </button>
  );
}
