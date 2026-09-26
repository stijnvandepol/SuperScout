"use client";

import { useState } from "react";
import type { CardOffer } from "@superscout/core";
import { OfferCard } from "./OfferCard";

/**
 * The remainder of a listing, fetched when asked for.
 *
 * Appends into the same grid rhythm as the server-rendered cards. On failure
 * the button stays, with a message — never a silent dead end.
 */
export function LoadMoreOffers({
  kind,
  slug,
  loaded,
  total,
  nowIso,
}: {
  kind: string;
  slug: string;
  loaded: number;
  total: number;
  nowIso: string;
}) {
  const [extra, setExtra] = useState<CardOffer[]>([]);
  const [dataDate, setDataDate] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const shown = loaded + extra.length;

  const more = async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/lijst?soort=${kind}&slug=${encodeURIComponent(slug)}&vanaf=${shown}`);
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { offers: CardOffer[]; dataDate: string | null };
      // Skip anything already on screen: the list may have been re-ingested
      // between the page render and this click.
      setExtra((prev) => {
        const seen = new Set(prev.map((o) => o.id));
        return [...prev, ...body.offers.filter((o) => !seen.has(o.id))];
      });
      setDataDate(body.dataDate);
      setState("idle");
    } catch {
      setState("error");
    }
  };

  return (
    <>
      {extra.length > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {extra.map((o) => (
            <OfferCard key={o.id} offer={o} nowIso={nowIso} dataDate={dataDate} />
          ))}
        </div>
      ) : null}
      {shown < total ? (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={more}
            disabled={state === "loading"}
            className="rounded-full bg-ink px-6 py-3 font-display text-sm font-bold text-bg transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {state === "loading" ? "Laden…" : `Toon meer (${total - shown})`}
          </button>
          {state === "error" ? (
            <p role="alert" className="mt-2 text-sm text-urgent">
              Laden lukte niet. Probeer het nog eens.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
