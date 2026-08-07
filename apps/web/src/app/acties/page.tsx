import type { Metadata } from "next";
import Link from "next/link";
import { getOffers } from "@/lib/offers";
import { DEAL_TYPES } from "@/lib/deal-types";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Soorten aanbiedingen — 1+1 gratis, % korting en stapelacties",
  description:
    "Blader per actievorm door de supermarktaanbiedingen van deze week: 1+1 gratis, procenten korting, stapelacties en directe prijsverlagingen bij alle grote ketens.",
  alternates: { canonical: "/acties" },
};

export default function DealTypesPage() {
  const offers = getOffers();

  const types = DEAL_TYPES.map((type) => ({
    ...type,
    count: offers.filter(type.matches).length,
  })).filter((type) => type.count > 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 pb-24">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Acties", path: "/acties" },
        ])}
      />

      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Aanbiedingen per actievorm
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        Supermarkten verpakken hun korting op een handvol manieren. Kies de actievorm die je zoekt
        en zie meteen welke ketens hem deze week aanbieden.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {types.map((type) => (
          <Link
            key={type.slug}
            href={`/acties/${type.slug}`}
            className="rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-lg font-bold tracking-tight">{type.label}</h2>
              <span className="font-mono text-xs text-ink-soft">{type.count}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{type.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
