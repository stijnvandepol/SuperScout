import type { Metadata } from "next";
import Link from "next/link";
import { categoriesPresent } from "@/lib/offers";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Alle categorieën — SuperScout",
  description: "Blader door alle productcategorieën met actuele supermarktaanbiedingen.",
};

export default function CategoriesPage() {
  const categories = categoriesPresent();
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Categorieën</h1>
      <p className="mt-2 font-mono text-sm text-ink-soft">Kies een categorie om de aanbiedingen te zien.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((c) => (
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
    </div>
  );
}
