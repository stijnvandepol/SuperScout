import Link from "next/link";
import { STORE_META } from "@/lib/format";
import { OFFERS, categoriesPresent, stats } from "@/lib/offers";
import { OfferExplorer } from "@/components/OfferExplorer";

export default function Home() {
  const { total, stores } = stats(OFFERS);
  const categories = categoriesPresent();
  const storeSlugs = [...new Set(OFFERS.map((o) => o.source))].sort();
  // Reference "now" resolved once on the server so client + SSR agree (no
  // hydration mismatch). For a static build this is build time — production
  // freshness will come from ISR/revalidation later.
  const nowIso = new Date().toISOString();

  return (
    <div className="mx-auto max-w-6xl px-5">
      <nav className="flex items-center justify-between py-6">
        <span className="font-display text-xl font-bold tracking-tight">
          Super<span className="text-deal">Scout</span>
        </span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
          NL · deze week
        </span>
      </nav>

      <header className="pb-8 pt-6 sm:pt-10">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
          Alle aanbiedingen · één plek
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Nooit meer folders doorbladeren.
          <br />
          <span className="text-ink-soft">Vind de </span>
          <span className="text-deal">beste deal</span>
          <span className="text-ink-soft"> in seconden.</span>
        </h1>
        <p className="mt-5 font-mono text-sm text-ink-soft">
          {total} aanbiedingen · {stores} winkels · Albert Heijn, Jumbo, Plus &amp; Dirk
        </p>
      </header>

      <section className="border-y border-line py-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
              Categorieën
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/categorie/${c.slug}`}
                  className="rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-xs font-bold text-ink-soft transition-colors hover:text-ink"
                >
                  {c.label} <span className="text-ink-soft/60">{c.count}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
            Winkels
          </p>
          <div className="flex flex-wrap gap-2">
            {storeSlugs.map((s) => (
              <Link
                key={s}
                href={`/winkel/${s}`}
                className="rounded-full px-3.5 py-1.5 font-mono text-xs font-bold"
                style={{ background: STORE_META[s].bg, color: STORE_META[s].fg }}
              >
                {STORE_META[s].name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="pb-24 pt-8">
        <OfferExplorer offers={OFFERS} nowIso={nowIso} />
      </div>
    </div>
  );
}
