import Link from "next/link";
import { STORE_META } from "@/lib/format";
import { categoriesPresent, getOffers, stats } from "@/lib/offers";
import { OfferExplorer } from "@/components/OfferExplorer";

// Re-read live offers periodically (ISR).
export const revalidate = 1800;

export default function Home() {
  const offers = getOffers();
  const { total, stores } = stats(offers);
  const categories = categoriesPresent();
  const storeSlugs = [...new Set(offers.map((o) => o.source))].sort();
  const storeNames = storeSlugs.map((s) => STORE_META[s].name);
  const storeList =
    storeNames.length > 1
      ? `${storeNames.slice(0, -1).join(", ")} & ${storeNames[storeNames.length - 1]}`
      : (storeNames[0] ?? "");
  // Reference "now" resolved once on the server so client + SSR agree (no
  // hydration mismatch). For a static build this is build time — production
  // freshness will come from ISR/revalidation later.
  const nowIso = new Date().toISOString();

  return (
    <div className="mx-auto max-w-6xl px-5">
      <header className="pb-8 pt-8 sm:pt-12">
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
          {total} aanbiedingen · {stores} winkels · {storeList}
        </p>
      </header>

      <section className="border-y border-line py-6">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
          Categorieën
        </p>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/categorie/${c.slug}`}
              className="shrink-0 whitespace-nowrap rounded-full border border-line bg-surface px-3.5 py-2 font-mono text-xs font-bold text-ink-soft transition-colors hover:text-ink"
            >
              {c.label} <span className="text-ink-soft/60">{c.count}</span>
            </Link>
          ))}
        </div>

        <p className="mb-2 mt-5 font-mono text-[11px] uppercase tracking-widest text-ink-soft">
          Winkels
        </p>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
          {storeSlugs.map((s) => (
            <Link
              key={s}
              href={`/winkel/${s}`}
              className="shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 font-mono text-xs font-bold"
              style={{ background: STORE_META[s].bg, color: STORE_META[s].fg }}
            >
              {STORE_META[s].name}
            </Link>
          ))}
        </div>
      </section>

      <div className="pb-24 pt-8">
        <OfferExplorer offers={offers} nowIso={nowIso} />
      </div>
    </div>
  );
}
