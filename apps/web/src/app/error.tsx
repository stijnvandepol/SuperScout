"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-level error boundary.
 *
 * This does not change the status code — a server render that throws is still a
 * 500 — but it does two things that matter. It replaces an unstyled crash page
 * with something a visitor can act on, and it logs the digest, which is the
 * only handle you get on a production stack trace in Next. Search Console was
 * reporting 18 server errors with no way to tell which pages threw; the digest
 * in the container log is that missing link.
 *
 * The structural fix lives in `lib/offers.ts`, which quarantines unrenderable
 * records before they reach a component. This is the net under it.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[render] page failed", error.digest ?? "", error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 pb-24">
      <p className="font-mono text-[11px] uppercase tracking-widest text-urgent">
        Er ging iets mis
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Deze pagina kon niet worden geladen
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        Waarschijnlijk ligt het aan ons, niet aan jou. Probeer het opnieuw, of ga terug naar het
        overzicht met alle aanbiedingen van deze week.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-ink px-6 py-3 font-display text-sm font-bold text-surface"
        >
          Opnieuw proberen
        </button>
        <Link
          href="/"
          className="rounded-full border border-line px-6 py-3 font-display text-sm font-bold"
        >
          Naar alle aanbiedingen
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-10 font-mono text-xs text-ink-soft">Referentie: {error.digest}</p>
      ) : null}
    </div>
  );
}
