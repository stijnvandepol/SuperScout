import type { Metadata } from "next";
import { getOffers, stats } from "@/lib/offers";
import { OfferExplorer } from "@/components/OfferExplorer";

// Re-read live offers periodically (ISR).
export const revalidate = 1800;

// Filtered/searched variants (?q=…) all canonicalise to the clean homepage.
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  const offers = getOffers();
  const { total, stores } = stats(offers);
  // Reference "now" resolved once on the server so client + SSR agree.
  const nowIso = new Date().toISOString();

  return (
    <div className="mx-auto max-w-6xl px-5">
      <div className="pb-24 pt-6">
        <OfferExplorer
          offers={offers}
          nowIso={nowIso}
          stat={`${total} aanbiedingen · ${stores} winkels`}
        />
      </div>
    </div>
  );
}
