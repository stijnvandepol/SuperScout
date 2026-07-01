import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_LABEL, type CategorySlug } from "@superscout/core";
import { byBiggestDiscount, categoriesPresent, offersInCategory } from "@/lib/offers";
import { OfferGrid } from "@/components/OfferGrid";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return categoriesPresent().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const label = CATEGORY_LABEL[slug as CategorySlug];
  if (!label) return { title: "Categorie niet gevonden — SuperScout" };
  const count = offersInCategory(slug).length;
  const title = `${label} aanbiedingen — SuperScout`;
  const description = `Alle ${count} aanbiedingen in ${label} van Albert Heijn, Jumbo, Plus en Dirk. Vergelijk en vind de beste deal.`;
  return { title, description, openGraph: { title, description, type: "website", locale: "nl_NL" } };
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const label = CATEGORY_LABEL[slug as CategorySlug];
  const offers = byBiggestDiscount(offersInCategory(slug));
  if (!label || offers.length === 0) notFound();

  const nowIso = new Date().toISOString();

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      <nav className="flex items-center justify-between py-6">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Super<span className="text-deal">Scout</span>
        </Link>
        <Link href="/" className="font-mono text-[11px] uppercase tracking-widest text-ink-soft hover:text-ink">
          ← alle aanbiedingen
        </Link>
      </nav>

      <header className="py-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Categorie</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">{label}</h1>
        <p className="mt-2 font-mono text-sm text-ink-soft">{offers.length} aanbiedingen · deze week</p>
      </header>

      <div className="mt-4">
        <OfferGrid offers={offers} nowIso={nowIso} />
      </div>
    </div>
  );
}
