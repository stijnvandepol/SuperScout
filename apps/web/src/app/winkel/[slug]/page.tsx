import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { SupermarketSlug } from "@superscout/core";
import { byBiggestDiscount, getOffers } from "@/lib/offers";
import { STORE_META, offerSlug } from "@/lib/format";
import { OfferGrid } from "@/components/OfferGrid";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, offerListJsonLd, SITE_URL } from "@/lib/seo";

export const revalidate = 1800;

type Params = { params: Promise<{ slug: string }> };

function storeOffers(slug: string) {
  return getOffers().filter((o) => o.source === slug);
}

export function generateStaticParams() {
  return [...new Set(getOffers().map((o) => o.source))].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const meta = STORE_META[slug as SupermarketSlug];
  if (!meta) return { title: "Winkel niet gevonden" };
  const count = storeOffers(slug).length;
  const title = `${meta.name} aanbiedingen deze week`;
  const description = `Alle ${count} actuele ${meta.name}-aanbiedingen op één plek. Vergelijk de acties van deze week en vind direct de beste deal. Dagelijks ververst.`;
  const canonical = `/winkel/${slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: "website", locale: "nl_NL", url: canonical },
  };
}

export default async function StorePage({ params }: Params) {
  const { slug } = await params;
  const meta = STORE_META[slug as SupermarketSlug];
  const offers = byBiggestDiscount(storeOffers(slug));
  if (!meta || offers.length === 0) notFound();

  const nowIso = new Date().toISOString();
  const canonical = `/winkel/${slug}`;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Winkels", path: "/winkels" },
          { name: meta.name, path: canonical },
        ])}
      />
      <JsonLd
        data={offerListJsonLd({
          name: `${meta.name} aanbiedingen`,
          description: `Actuele aanbiedingen van ${meta.name}.`,
          url: `${SITE_URL}${canonical}`,
          offers,
          slugOf: offerSlug,
        })}
      />

      <header className="py-8">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex h-9 items-center rounded-lg px-3 font-display text-base font-bold"
            style={{ background: meta.bg, color: meta.fg }}
          >
            {meta.name}
          </span>
          <span className="font-mono text-sm text-ink-soft">
            {offers.length} aanbiedingen · deze week
          </span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {meta.name} aanbiedingen
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          Bekijk alle actuele {meta.name}-aanbiedingen van deze week, gesorteerd op de grootste
          korting. Zet je favorieten in je mandje en bestel of haal ze direct bij {meta.name}.
        </p>
      </header>

      <div className="mt-2">
        <OfferGrid offers={offers} nowIso={nowIso} />
      </div>
    </div>
  );
}
