import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORY_LABEL, type CategorySlug } from "@superscout/core";
import { byBiggestDiscount, categoriesPresent, offersInCategory } from "@/lib/offers";
import { offerSlug } from "@/lib/format";
import { OfferGrid } from "@/components/OfferGrid";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, offerListJsonLd, SITE_URL } from "@/lib/seo";

export const revalidate = 1800;

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return categoriesPresent().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const label = CATEGORY_LABEL[slug as CategorySlug];
  if (!label) return { title: "Categorie niet gevonden" };
  const count = offersInCategory(slug).length;
  const title = `${label} aanbiedingen deze week`;
  const description = `Alle ${count} aanbiedingen in ${label} van alle grote supermarkten naast elkaar. Vergelijk de prijzen en vind de beste deal.`;
  const canonical = `/categorie/${slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: "website", locale: "nl_NL", url: canonical },
  };
}

export default async function CategoryPage({ params }: Params) {
  const { slug } = await params;
  const label = CATEGORY_LABEL[slug as CategorySlug];
  const offers = byBiggestDiscount(offersInCategory(slug));
  if (!label || offers.length === 0) notFound();

  const nowIso = new Date().toISOString();
  const canonical = `/categorie/${slug}`;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Categorieën", path: "/categorieen" },
          { name: label, path: canonical },
        ])}
      />
      <JsonLd
        data={offerListJsonLd({
          name: `${label} aanbiedingen`,
          description: `Actuele aanbiedingen in ${label}.`,
          url: `${SITE_URL}${canonical}`,
          offers,
          slugOf: offerSlug,
        })}
      />

      <header className="py-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Categorie</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {label} aanbiedingen
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          Alle {offers.length} actuele aanbiedingen in {label.toLowerCase()} van deze week,
          gesorteerd op de grootste korting. Vergelijk in één oogopslag welke supermarkt de beste
          deal heeft.
        </p>
      </header>

      <div className="mt-2">
        <OfferGrid offers={offers} nowIso={nowIso} />
      </div>
    </div>
  );
}
