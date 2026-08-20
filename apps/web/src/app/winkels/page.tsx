import { SITE_FEED_ALTERNATE } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { STORE_META } from "@/lib/format";
import { getOffers } from "@/lib/offers";
import { chainSentence, dutchList, missingChains } from "@/lib/chains";

export const revalidate = 1800;

export function generateMetadata(): Metadata {
  return {
    title: "Alle supermarkten",
    description: `Bekijk de actuele aanbiedingen per supermarkt: ${chainSentence()}.`,
    alternates: { canonical: "/winkels", types: SITE_FEED_ALTERNATE },
  };
}

export default function StoresPage() {
  const offers = getOffers();
  const slugs = [...new Set(offers.map((o) => o.source))].sort();
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Winkels</h1>
      <p className="mt-2 font-mono text-sm text-ink-soft">Kies een supermarkt.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {slugs.map((s) => {
          const meta = STORE_META[s];
          const count = offers.filter((o) => o.source === s).length;
          return (
            <Link
              key={s}
              href={`/winkel/${s}`}
              className="flex items-center justify-between rounded-2xl p-4 font-display font-bold"
              style={{ background: meta.bg, color: meta.fg }}
            >
              <span>{meta.name}</span>
              <span className="font-mono text-xs opacity-80">{count}</span>
            </Link>
          );
        })}
      </div>

      <UnavailableChains />
    </div>
  );
}

/**
 * Chains SuperScout supports but has no data for today.
 *
 * The one place a failing adapter becomes visible without server access. The
 * ingestion worker isolates each source, so one broken chain never takes the
 * others down — but that also made failure completely silent: four adapters
 * stopped producing and the site went on advertising ten chains for weeks.
 *
 * Saying so is also better for the visitor. Someone who shops at Dirk and finds
 * it missing should learn that it is temporarily unavailable, not conclude the
 * site does not cover it.
 */
function UnavailableChains() {
  const missing = missingChains();
  if (missing.length === 0) return null;

  return (
    <section className="mt-10 rounded-2xl border border-line bg-surface-2 p-5">
      <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink-soft">
        Tijdelijk niet beschikbaar
      </h2>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        {dutchList(missing.map((m) => m.name))}{" "}
        {missing.length === 1 ? "hoort" : "horen"} er ook bij, maar{" "}
        {missing.length === 1 ? "publiceert" : "publiceren"} de folder op dit moment op een manier
        die we niet kunnen inlezen. We laten die acties liever weg dan dat we je verouderde prijzen
        voorschotelen.
      </p>
    </section>
  );
}
