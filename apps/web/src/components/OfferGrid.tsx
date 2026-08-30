import type { CardOffer } from "@superscout/core";
import { OfferCard } from "./OfferCard";

export function OfferGrid({
  offers,
  nowIso,
  dataDate = null,
}: {
  offers: CardOffer[];
  nowIso: string;
  dataDate?: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {offers.map((offer, i) => (
        // The grid is 2 columns on mobile and 4 on desktop, so the first card
        // is the LCP candidate on both.
        <OfferCard
          key={offer.id}
          offer={offer}
          nowIso={nowIso}
          dataDate={dataDate}
          priority={i === 0}
        />
      ))}
    </div>
  );
}
