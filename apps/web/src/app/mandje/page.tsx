import type { Metadata } from "next";
import { BasketView } from "@/components/BasketView";
import { getOffers } from "@/lib/offers";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Mijn mandje",
  description: "Je verzamelde aanbiedingen per winkel, klaar om te bestellen in de app.",
  // Personal, empty-by-default utility page — no search value.
  robots: { index: false, follow: true },
};

export default function MandjePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Mijn mandje</h1>
      <p className="mt-2 font-mono text-sm text-ink-soft">
        Per winkel gegroepeerd — open de winkel-app om te bestellen.
      </p>
      <BasketView allOffers={getOffers()} />
    </div>
  );
}
