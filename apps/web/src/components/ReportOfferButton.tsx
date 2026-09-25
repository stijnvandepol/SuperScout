"use client";

import { useId, useState } from "react";
import { track } from "@/lib/analytics";
import { MAX_NOTE_LENGTH, REPORT_REASONS, type ReportReason } from "@/lib/reports-shared";

type State = "closed" | "open" | "sending" | "sent" | "error";

/**
 * "Klopt er iets niet?" — a report without an account or an e-mail address.
 *
 * Collapsed by default so it never competes with the store button, and plain
 * form semantics throughout so it works with a keyboard and a screen reader.
 */
export function ReportOfferButton({ offerId }: { offerId: string }) {
  const [state, setState] = useState<State>("closed");
  const [reason, setReason] = useState<ReportReason>("prijs-klopt-niet");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const id = useId();

  if (state === "closed") {
    return (
      <button
        type="button"
        onClick={() => setState("open")}
        className="font-mono text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
      >
        Klopt er iets niet? Meld het
      </button>
    );
  }

  if (state === "sent") {
    return (
      <p role="status" className="text-sm text-fresh">
        Dank je — we kijken ernaar. Foute aanbiedingen halen we zo snel mogelijk van de site.
      </p>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/melding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, reason, note }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Versturen lukte niet.");
      }
      track("Fout gemeld", { reden: reason });
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Versturen lukte niet.");
      setState("error");
    }
  };

  return (
    <form onSubmit={submit} className="w-full rounded-xl border border-line bg-surface-2 p-4" aria-labelledby={`${id}-t`}>
      <p id={`${id}-t`} className="font-display text-sm font-bold">
        Wat klopt er niet?
      </p>
      <fieldset className="mt-3 space-y-2">
        <legend className="sr-only">Reden</legend>
        {(Object.keys(REPORT_REASONS) as ReportReason[]).map((key) => (
          <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name={`${id}-reason`}
              value={key}
              checked={reason === key}
              onChange={() => setReason(key)}
              className="accent-current"
            />
            {REPORT_REASONS[key]}
          </label>
        ))}
      </fieldset>
      <label htmlFor={`${id}-note`} className="mt-4 block text-sm">
        Toelichting <span className="text-ink-soft">(optioneel, geen persoonsgegevens)</span>
      </label>
      <textarea
        id={`${id}-note`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={MAX_NOTE_LENGTH}
        rows={2}
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-deal focus:ring-2 focus:ring-deal/20"
      />
      {state === "error" ? (
        <p role="alert" className="mt-2 text-sm text-urgent">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-full bg-ink px-4 py-2 font-display text-sm font-bold text-bg disabled:opacity-50"
        >
          {state === "sending" ? "Versturen…" : "Verstuur melding"}
        </button>
        <button
          type="button"
          onClick={() => setState("closed")}
          className="rounded-full px-4 py-2 font-mono text-xs text-ink-soft hover:text-ink"
        >
          Annuleer
        </button>
      </div>
    </form>
  );
}
