import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { SupermarketSlug } from "@superscout/core";
import { byBiggestDiscount, getOffers } from "@/lib/offers";
import { STORE_META } from "@/lib/format";
import { OfferGrid } from "@/components/OfferGrid";

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
  if (!meta) return { title: "Winkel niet gevonden — SuperScout" };
  const count = storeOffers(slug).length;
  const title = `${meta.name} aanbiedingen — SuperScout`;
  const description = `Alle ${count} actuele aanbiedingen van ${meta.name} op één plek. Deze week bij ${meta.name}.`;
  return { title, description, openGraph: { title, description, type: "website", locale: "nl_NL" } };
}

export default async function StorePage({ params }: Params) {
  const { slug } = await params;
  const meta = STORE_META[slug as SupermarketSlug];
  const offers = byBiggestDiscount(storeOffers(slug));
  if (!meta || offers.length === 0) notFound();

  const nowIso = new Date().toISOString();

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      <header className="flex items-center gap-3 py-8">
        <span
          className="inline-flex h-10 items-center rounded-lg px-3 font-display text-lg font-bold"
          style={{ background: meta.bg, color: meta.fg }}
        >
          {meta.name}
        </span>
        <span className="font-mono text-sm text-ink-soft">{offers.length} aanbiedingen · deze week</span>
      </header>

      <div className="mt-4">
        <OfferGrid offers={offers} nowIso={nowIso} />
      </div>
    </div>
  );
}
