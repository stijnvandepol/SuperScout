import Link from "next/link";
import type { Offer } from "@superscout/core";
import { daysUntilExpiry, isExpiringSoon } from "@superscout/core";
import { formatEuro, offerSlug, stickerLabel, validUntilShort } from "@/lib/format";
import { StoreBadge } from "./StoreBadge";
import { DiscountSticker } from "./DiscountSticker";
import { AddToBasketButton } from "./AddToBasketButton";

export function OfferCard({ offer, nowIso }: { offer: Offer; nowIso: string }) {
  const { pricing } = offer;
  const hasPrice = pricing.currentPriceCents !== null;
  const soon = isExpiringSoon(offer.validUntil, nowIso);
  const daysLeft = daysUntilExpiry(offer.validUntil, nowIso);
  const expiryText = soon
    ? daysLeft <= 1
      ? "verloopt vandaag"
      : `nog ${daysLeft} dagen`
    : validUntilShort(offer.validUntil);
  const productHref = `/aanbieding/${offerSlug(offer)}`;

  // Image + brand/title/price — the part that navigates to the store.
  const visual = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {offer.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={offer.imageUrl}
            alt={offer.title}
            loading="lazy"
            className="h-full w-full object-contain p-4 mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-5xl text-ink-soft/30">
            €
          </div>
        )}
        <div className="absolute right-2.5 top-2.5">
          <DiscountSticker label={stickerLabel(offer)} />
        </div>
        <div className="absolute left-2.5 top-2.5">
          <StoreBadge source={offer.source} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-4 pb-2 pt-4">
        {offer.brand ? (
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
            {offer.brand}
          </span>
        ) : null}
        <h3 className="font-display text-[15px] font-medium leading-snug line-clamp-2">
          {offer.title}
        </h3>

        <div className="mt-auto flex min-h-8 items-end gap-2 pt-2">
          {hasPrice ? (
            <>
              <span className="font-display text-2xl font-bold tabular-nums leading-none">
                {formatEuro(pricing.currentPriceCents)}
              </span>
              {pricing.originalPriceCents !== null ? (
                <span className="font-mono text-sm text-ink-soft line-through">
                  {formatEuro(pricing.originalPriceCents)}
                </span>
              ) : null}
            </>
          ) : (
            <span className="font-display text-lg font-bold leading-none">
              {offer.rawLabel ?? stickerLabel(offer)}
            </span>
          )}
        </div>

        {pricing.savingsAbsoluteCents !== null ? (
          <span className="w-fit rounded-md bg-fresh/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-fresh">
            je bespaart {formatEuro(pricing.savingsAbsoluteCents)}
          </span>
        ) : null}
      </div>
    </>
  );

  const cardClass =
    "group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-shadow duration-200 hover:shadow-[0_10px_34px_rgba(0,0,0,0.09)]";
  const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deal";

  // One clear tap target: the card opens our own product page. From there the
  // shopper goes to the store. (The store link is not on the card itself, so
  // there is no nested-anchor / accidental-external-tap confusion.)
  return (
    <article className={cardClass}>
      <Link href={productHref} className={`flex flex-1 flex-col ${focus}`}>
        {visual}
      </Link>
      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2 font-mono text-[11px] text-ink-soft">
        <span className={`truncate ${soon ? "font-bold text-urgent" : ""}`}>{expiryText}</span>
        <AddToBasketButton id={offer.id} variant="mini" />
      </div>
    </article>
  );
}
