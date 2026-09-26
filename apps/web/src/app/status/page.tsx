import type { Metadata } from "next";
import Link from "next/link";
import { INGESTED_SUPERMARKETS } from "@superscout/core";
import { liveChains } from "@/lib/chains";
import { readIngestStatus } from "@/lib/health";
import { STORE_META } from "@/lib/format";

// Per request: this page exists to say how fresh the data is right now.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Status van de aanbiedingen",
  description:
    "Per winkel: wanneer SuperScout de aanbiedingen voor het laatst ophaalde, hoeveel het er zijn, en waarom een winkel soms ontbreekt.",
  alternates: { canonical: "/status" },
};

function ago(iso: string, now: number): string {
  const hours = Math.round((now - Date.parse(iso)) / 3_600_000);
  if (hours < 1) return "minder dan een uur geleden";
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.round(hours / 24);
  return days === 1 ? "gisteren" : `${days} dagen geleden`;
}

/**
 * Public data status, per chain.
 *
 * Folder sites never say how old their information is or why a store is
 * missing; that silence is part of why they are hard to trust. This page says
 * both, in plain words — including when a chain is missing because we chose
 * to respect its robots.txt or its refusal.
 */
export default function StatusPage() {
  const now = Date.now();
  const live = new Map(liveChains().map((c) => [c.slug, c]));
  const status = readIngestStatus();
  const result = new Map(status?.results.map((r) => [r.source, r]) ?? []);

  const rows = INGESTED_SUPERMARKETS.map((slug) => {
    const chain = live.get(slug);
    const r = result.get(slug);
    let state: { label: string; tone: "ok" | "warn" | "off"; detail?: string };
    if (chain) {
      state = { label: "Actueel", tone: "ok" };
    } else if (r?.blockedSince) {
      state = {
        label: "Gepauzeerd",
        tone: "off",
        detail: `${STORE_META[slug].name} weigerde ons verzoek. We respecteren dat en proberen het over een week één keer opnieuw.`,
      };
    } else if (r?.error?.startsWith("robots.txt")) {
      state = {
        label: "Gepauzeerd",
        tone: "off",
        detail: `De robots.txt van ${STORE_META[slug].name} staat het ophalen niet toe. Dan halen we het niet op.`,
      };
    } else {
      state = {
        label: "Tijdelijk niet beschikbaar",
        tone: "warn",
        detail: "Het ophalen lukte bij de laatste ronde niet. Meestal is dat de volgende dag verholpen.",
      };
    }
    return { slug, chain, state };
  }).sort((a, b) => STORE_META[a.slug].name.localeCompare(STORE_META[b.slug].name, "nl"));

  // Feed-based retailers (not in INGESTED_SUPERMARKETS) that are live.
  const extra = [...live.values()].filter((c) => !INGESTED_SUPERMARKETS.includes(c.slug));

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24">
      <header className="pb-8 pt-10 sm:pt-14">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">Status</p>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">Hoe vers zijn de aanbiedingen?</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          SuperScout haalt de aanbiedingen elke ochtend één keer op. Hieronder zie je per winkel
          wanneer dat voor het laatst lukte. Ontbreekt een winkel, dan staat erbij waarom — ook als
          dat is omdat die winkel het niet wil.
        </p>
      </header>

      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {[...rows, ...extra.map((c) => ({ slug: c.slug, chain: c, state: { label: "Actueel", tone: "ok" as const } }))].map(
          ({ slug, chain, state }) => (
            <li key={slug} className="px-5 py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                {chain ? (
                  <Link href={`/winkel/${slug}`} className="font-display font-bold hover:underline">
                    {STORE_META[slug].name}
                  </Link>
                ) : (
                  <span className="font-display font-bold">{STORE_META[slug].name}</span>
                )}
                <span
                  className={`rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
                    state.tone === "ok"
                      ? "bg-fresh/10 text-fresh"
                      : state.tone === "warn"
                        ? "bg-urgent/10 text-urgent"
                        : "bg-ink/[0.06] text-ink-soft"
                  }`}
                >
                  {state.label}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {chain
                  ? `${chain.count} aanbiedingen · opgehaald ${ago(chain.fetchedAt, now)}`
                  : "detail" in state
                    ? state.detail
                    : null}
              </p>
            </li>
          ),
        )}
      </ul>

      <p className="mt-8 text-[15px] leading-relaxed text-ink-soft">
        Zo halen we de data op: één keer per dag, met respect voor de robots.txt van elke winkel,
        en we stoppen als een winkel ons weigert. Meer daarover op{" "}
        <Link href="/ethiek" className="font-bold text-ink underline underline-offset-2">
          ethiek &amp; transparantie
        </Link>
        .
      </p>
    </div>
  );
}
