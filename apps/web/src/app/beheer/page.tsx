import type { Metadata } from "next";
import Link from "next/link";
import type { Offer, RetailerSlug } from "@superscout/core";
import { RETAILER_SLUGS, RETAILERS, SECTOR_LABEL, categorizeOffer } from "@superscout/core";
import { getOffers, getArchivedOffers } from "@/lib/offers";
import { offerSlug, provenanceLabel } from "@/lib/format";
import { readReports, REPORT_REASONS } from "@/lib/reports";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Beheer",
  robots: { index: false, follow: false },
};

interface Health {
  slug: RetailerSlug;
  count: number;
  newest: string | null;
  noEndDate: number;
  noPrice: number;
  noImage: number;
  uncategorised: number;
  suspicious: number;
  sources: string[];
}

/** Data quality per retailer: what an operator checks before trusting a day's ingest. */
function health(offers: Offer[]): Health[] {
  return RETAILER_SLUGS.filter((slug) => RETAILERS[slug].ingested || offers.some((o) => o.source === slug))
    .map((slug) => {
      const own = offers.filter((o) => o.source === slug);
      return {
        slug,
        count: own.length,
        newest: own.reduce<string | null>((n, o) => (!n || o.fetchedAt > n ? o.fetchedAt : n), null),
        noEndDate: own.filter((o) => !o.validUntil).length,
        noPrice: own.filter((o) => o.pricing.currentPriceCents === null).length,
        noImage: own.filter((o) => !o.imageUrl).length,
        uncategorised: own.filter((o) => categorizeOffer(o) === "overig").length,
        suspicious: own.filter((o) => (o.pricing.savingsPercent ?? 0) > 75).length,
        sources: [...new Set(own.map((o) => provenanceLabel(o)))],
      };
    });
}

function pct(part: number, whole: number): string {
  return whole === 0 ? "—" : `${Math.round((part / whole) * 100)}%`;
}

function hoursAgo(iso: string | null): string {
  if (!iso) return "—";
  const h = Math.round((Date.now() - Date.parse(iso)) / 3_600_000);
  return h < 1 ? "< 1 u" : `${h} u`;
}

/**
 * The operator's page: data health per retailer and the report queue.
 *
 * Read-only by design. Acting on a report means adding its id to the
 * blocklist file (OFFER_BLOCKLIST_PATH) or fixing the feed — both on the
 * server, where a write needs a shell, not a password in a browser form.
 */
export default function BeheerPage() {
  const offers = getOffers();
  const rows = health(offers);
  const reports = readReports(200);
  const byId = new Map<string, Offer>();
  for (const o of [...getArchivedOffers(), ...offers]) byId.set(o.id, o);

  const grouped = new Map<string, { count: number; reasons: Set<string>; notes: string[]; last: string }>();
  for (const r of reports) {
    const g = grouped.get(r.offerId) ?? { count: 0, reasons: new Set<string>(), notes: [], last: r.at };
    g.count += 1;
    g.reasons.add(REPORT_REASONS[r.reason] ?? r.reason);
    if (r.note) g.notes.push(r.note);
    grouped.set(r.offerId, g);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">Beheer</h1>
      <p className="mt-2 font-mono text-xs text-ink-soft">
        {offers.length} live aanbiedingen · {reports.length} recente meldingen
      </p>

      <h2 className="mt-10 font-display text-xl font-bold">Datakwaliteit per winkel</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
            <tr>
              <th className="py-2 pr-4">Winkel</th>
              <th className="py-2 pr-4">Sector</th>
              <th className="py-2 pr-4">Live</th>
              <th className="py-2 pr-4">Opgehaald</th>
              <th className="py-2 pr-4">Geen einddatum</th>
              <th className="py-2 pr-4">Geen prijs</th>
              <th className="py-2 pr-4">Geen foto</th>
              <th className="py-2 pr-4">Categorie “overig”</th>
              <th className="py-2 pr-4">&gt;75% korting</th>
              <th className="py-2">Bron</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-t border-line">
                <td className="py-2 pr-4 font-bold">{RETAILERS[r.slug].name}</td>
                <td className="py-2 pr-4">{SECTOR_LABEL[RETAILERS[r.slug].sector]}</td>
                <td className={`py-2 pr-4 font-mono ${r.count === 0 ? "font-bold text-urgent" : ""}`}>{r.count}</td>
                <td className="py-2 pr-4 font-mono">{hoursAgo(r.newest)}</td>
                <td className="py-2 pr-4 font-mono">{pct(r.noEndDate, r.count)}</td>
                <td className="py-2 pr-4 font-mono">{pct(r.noPrice, r.count)}</td>
                <td className="py-2 pr-4 font-mono">{pct(r.noImage, r.count)}</td>
                <td className="py-2 pr-4 font-mono">{pct(r.uncategorised, r.count)}</td>
                <td className={`py-2 pr-4 font-mono ${r.suspicious > 0 ? "text-urgent" : ""}`}>{r.suspicious}</td>
                <td className="py-2 text-ink-soft">{r.sources.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 font-display text-xl font-bold">Meldingen van bezoekers</h2>
      {grouped.size === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">
          Geen meldingen{process.env.REPORTS_PATH ? "" : " (REPORTS_PATH is niet ingesteld; meldingen staan dan alleen in de containerlogs)"}.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {[...grouped.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .map(([id, g]) => {
              const offer = byId.get(id);
              return (
                <li key={id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span>
                      <strong>{g.count}×</strong>{" "}
                      {offer ? (
                        <Link href={`/aanbieding/${offerSlug(offer)}`} className="underline underline-offset-2">
                          {offer.title}
                        </Link>
                      ) : (
                        <span className="text-ink-soft">(niet meer in de data)</span>
                      )}{" "}
                      <code className="font-mono text-xs text-ink-soft">{id}</code>
                    </span>
                    <span className="font-mono text-xs text-ink-soft">laatst {g.last}</span>
                  </div>
                  <p className="mt-1 text-ink-soft">{[...g.reasons].join(" · ")}</p>
                  {g.notes.slice(0, 3).map((n, i) => (
                    <p key={i} className="mt-1 border-l-2 border-line pl-2 text-ink-soft">
                      {n}
                    </p>
                  ))}
                </li>
              );
            })}
        </ul>
      )}

      <p className="mt-10 max-w-2xl text-sm leading-relaxed text-ink-soft">
        Een aanbieding verbergen: zet het id in het JSON-bestand op <code>OFFER_BLOCKLIST_PATH</code>{" "}
        (bijv. <code>[&quot;ah:123&quot;]</code>). Binnen vijf minuten is hij van de site, ook via zijn oude
        URL. Nieuwe winkels via een feed: zie <code>docs/FEEDS.md</code>.
      </p>
    </div>
  );
}
