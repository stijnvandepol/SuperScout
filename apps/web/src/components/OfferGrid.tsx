import type { CardOffer } from "@superscout/core";
import { OfferCard } from "./OfferCard";
import { LoadMoreOffers } from "./LoadMoreOffers";
import { FIRST_PAGE, type ListKind } from "@/lib/lists";

export function OfferGrid({
  offers,
  nowIso,
  dataDate = null,
  list,
}: {
  offers: CardOffer[];
  nowIso: string;
  dataDate?: string | null;
  /**
   * Which listing this is. When given, only the first `FIRST_PAGE` offers are
   * rendered here and the rest load on request — see lib/lists.ts.
   */
  list?: { kind: ListKind; slug: string };
}) {
  const shown = list ? offers.slice(0, FIRST_PAGE) : offers;
  return (
    <>
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {shown.map((offer, i) => (
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
    {list && offers.length > shown.length ? (
      <LoadMoreOffers
        kind={list.kind}
        slug={list.slug}
        loaded={shown.length}
        total={offers.length}
        nowIso={nowIso}
      />
    ) : null}
    </>
  );
}
