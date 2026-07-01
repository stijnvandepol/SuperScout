import type { Offer } from "@superscout/core";
import { OfferCard } from "./OfferCard";

export function OfferGrid({ offers, nowIso }: { offers: Offer[]; nowIso: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} nowIso={nowIso} />
      ))}
    </div>
  );
}
