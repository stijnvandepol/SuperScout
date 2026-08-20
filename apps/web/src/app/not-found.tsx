import type { Metadata } from "next";
import Link from "next/link";
import { categoriesPresent, getOffers, stats } from "@/lib/offers";
import { STORE_META } from "@/lib/format";

export const revalidate = 1800;

// A 404 must never be indexed, and Next does not add this for us.
export const metadata: Metadata = {
  title: "Pagina niet gevonden",
  robots: { index: false, follow: true },
};

/**
 * The 404 page.
 *
 * Far fewer URLs reach this now that expired promotions are archived rather
 * than deleted, but the ones that do are mostly old inbound links. A dead end
 * wastes them; routing them into the live offer set does not, and `follow`
 * keeps whatever link equity they carry flowing into the site.
 */
export default function NotFound() {
  const offers = getOffers();
  const { total, stores } = stats(offers);
  const categories = categoriesPresent().slice(0, 8);
  const sources = [...new Set(offers.map((o) => o.source))];

  return (
    <div className="mx-auto max-w-3xl px-5 py-16 pb-24">
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Foutcode 404</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Deze pagina bestaat niet
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        Mogelijk klopt het adres niet, of is de pagina er nooit geweest. Afgelopen aanbiedingen
        blijven op SuperScout gewoon bestaan — die vind je terug via de winkel- of categoriepagina.
        Op dit moment staan er {total} aanbiedingen van {stores} supermarkten op de site.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full bg-ink px-6 py-3 font-display text-sm font-bold text-surface"
        >
          Naar alle aanbiedingen →
        </Link>
        <Link
          href="/categorieen"
          className="rounded-full border border-line px-6 py-3 font-display text-sm font-bold"
        >
          Bekijk per categorie
        </Link>
      </div>

      <section className="mt-14 border-t border-line pt-8">
        <h2 className="font-display text-lg font-bold tracking-tight">Per supermarkt</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {sources.map((source) => (
            <Link
              key={source}
              href={`/winkel/${source}`}
              className="rounded-full border border-line px-4 py-2 text-sm hover:border-ink"
            >
              {STORE_META[source].name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-bold tracking-tight">Populaire categorieën</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categorie/${category.slug}`}
              className="rounded-full border border-line px-4 py-2 text-sm hover:border-ink"
            >
              {category.label} ({category.count})
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
