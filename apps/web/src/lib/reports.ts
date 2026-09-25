import { appendFileSync, readFileSync } from "node:fs";
import { isReportReason, MAX_NOTE_LENGTH, type ReportReason } from "@/lib/reports-shared";

export { MAX_NOTE_LENGTH, REPORT_REASONS, isReportReason, type ReportReason } from "@/lib/reports-shared";

/**
 * Reports from visitors: "this price is wrong", "this offer has ended".
 *
 * Automatically ingested data will be wrong sometimes, and the visitor in the
 * shop is the first to know. Until now they had nowhere to say so except a
 * personal website. This is the smallest honest version of that channel: a
 * fixed list of reasons, an optional note, the offer id — and nothing about
 * the person. No IP address, no user agent, no timestamp finer than the minute.
 */

export interface OfferReport {
  offerId: string;
  reason: ReportReason;
  note?: string;
  /** ISO 8601, truncated to the minute. */
  at: string;
}

/**
 * Validate an incoming body. Returns the report, or a Dutch error message.
 * `knownOffer` decides whether the id exists — injected so this stays pure.
 */
export function parseReport(
  body: unknown,
  knownOffer: (id: string) => boolean,
  now: Date,
): OfferReport | string {
  if (!body || typeof body !== "object") return "ongeldig verzoek";
  const { offerId, reason, note } = body as Record<string, unknown>;

  if (typeof offerId !== "string" || !/^[a-z]+:[A-Za-z0-9._-]{1,64}$/.test(offerId)) {
    return "onbekende aanbieding";
  }
  if (!knownOffer(offerId)) return "onbekende aanbieding";
  if (!isReportReason(reason)) return "kies een reden";

  let cleanNote: string | undefined;
  if (note !== undefined && note !== null && note !== "") {
    if (typeof note !== "string") return "ongeldige toelichting";
    // Control characters out, whitespace collapsed: this is read by a human in
    // a terminal, and a note should not be able to rewrite the lines around it.
    cleanNote = note.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
    if (cleanNote.length > MAX_NOTE_LENGTH) return `toelichting is langer dan ${MAX_NOTE_LENGTH} tekens`;
    if (!cleanNote) cleanNote = undefined;
  }

  return {
    offerId,
    reason,
    ...(cleanNote ? { note: cleanNote } : {}),
    at: `${now.toISOString().slice(0, 16)}Z`,
  };
}

/**
 * Keep a report. Always logged to stdout, which `docker logs` retains even when
 * no file is configured; appended to REPORTS_PATH when it is.
 */
export function storeReport(report: OfferReport): void {
  const line = JSON.stringify(report);
  console.log(`[melding] ${line}`);
  const path = process.env.REPORTS_PATH;
  if (!path) return;
  try {
    appendFileSync(path, `${line}\n`, "utf-8");
  } catch (error) {
    console.error(`[melding] kon ${path} niet schrijven:`, error);
  }
}

/** The stored reports, newest first. Empty when nothing is configured or written yet. */
export function readReports(limit = 200): OfferReport[] {
  const path = process.env.REPORTS_PATH;
  if (!path) return [];
  try {
    return readFileSync(path, "utf-8")
      .split("\n")
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as OfferReport];
        } catch {
          return [];
        }
      })
      .reverse()
      .slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * A small in-memory limiter per client address.
 *
 * The address is used as a map key for ten minutes and never written anywhere.
 * Per process, so a restart forgets it — fine for spam from one source, which
 * is the only abuse a report form on a site this size realistically sees.
 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.max) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    // Bound the map: an attacker rotating addresses must not grow it forever.
    if (this.hits.size > 5_000) {
      for (const [k, times] of this.hits) {
        if (times.every((t) => now - t >= this.windowMs)) this.hits.delete(k);
      }
      if (this.hits.size > 5_000) this.hits.clear();
    }
    return true;
  }
}
