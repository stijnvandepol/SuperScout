import { SITE_FEED_ALTERNATE } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { DEPARTMENTS, type CategorySlug } from "@superscout/core";
import { categoriesPresent } from "@/lib/offers";

// Read at request time, never baked into the build: see `loadRaw` in
// lib/offers.ts for what a build-time prerender of this page contains.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Alle categorieën aanbiedingen",
  description:
    "Blader door alle productcategorieën met actuele aanbiedingen van deze week — van groente & fruit en koffie tot verzorging, huishouden en huisdieren.",
  alternates: { canonical: "/categorieen", types: SITE_FEED_ALTERNATE },
};

/**
 * Categories, grouped by department.
 *
 * Only departments with at least one indexable category are shown, so the
 * page never lists an empty "Klussen & tuin" heading before a DIY chain is
 * live.
 */
export default function CategoriesPage() {
  const present = new Map(categoriesPresent().map((c) => [c.slug, c]));
  const groups = DEPARTMENTS.map((d) => ({
    ...d,
    items: d.categories.flatMap((slug) => {
      const c = present.get(slug as CategorySlug);
      return c ? [c] : [];
    }),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Categorieën</h1>
      <p className="mt-2 font-mono text-sm text-ink-soft">Kies een categorie om de aanbiedingen te zien.</p>

      {groups.map((group) => (
        <section key={group.slug} className="mt-10" aria-labelledby={`afd-${group.slug}`}>
          <h2
            id={`afd-${group.slug}`}
            className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink-soft"
          >
            {group.label}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.items.map((c) => (
              <Link
                key={c.slug}
                href={`/categorie/${c.slug}`}
                className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 font-display font-medium transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
              >
                <span>{c.label}</span>
                <span className="font-mono text-xs text-ink-soft">{c.count}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
