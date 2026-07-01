import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { SupermarketSlug } from "@superscout/core";
import { OFFERS, byBiggestDiscount } from "@/lib/offers";
import { STORE_META } from "@/lib/format";
import { OfferGrid } from "@/components/OfferGrid";

type Params = { params: Promise<{ slug: string }> };

function storeOffers(slug: string) {
  return OFFERS.filter((o) => o.source === slug);
}

export function generateStaticParams() {
  return [...new Set(OFFERS.map((o) => o.source))].map((slug) => ({ slug }));
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
      <nav className="flex items-center justify-between py-6">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Super<span className="text-deal">Scout</span>
        </Link>
        <Link href="/" className="font-mono text-[11px] uppercase tracking-widest text-ink-soft hover:text-ink">
          ← alle aanbiedingen
        </Link>
      </nav>

      <header className="flex items-center gap-3 py-6">
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
