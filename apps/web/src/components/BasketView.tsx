"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Offer, SupermarketSlug } from "@superscout/core";
import { getBasket, onBasketChange, removeFromBasket } from "@/lib/basket";
import { formatEuro, offerSlug, STORE_META } from "@/lib/format";

export function BasketView({ allOffers }: { allOffers: Offer[] }) {
  const [ids, setIds] = useState<string[] | null>(null);

  useEffect(() => {
    const read = () => setIds(getBasket());
    read();
    return onBasketChange(read);
  }, []);

  if (ids === null) return <p className="mt-8 font-mono text-sm text-ink-soft">Laden…</p>;

  const byId = new Map(allOffers.map((o) => [o.id, o]));
  const items = ids
    .map((id) => byId.get(id))
    .filter((o): o is Offer => Boolean(o));

  if (items.length === 0) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-line py-16 text-center">
        <p className="font-display text-lg">Je mandje is leeg</p>
        <p className="mt-1 font-mono text-xs text-ink-soft">
          Tik “+ mandje” op een aanbieding om deze toe te voegen.
        </p>
        <Link href="/" className="mt-5 inline-block rounded-full bg-deal px-5 py-2.5 font-display text-sm font-bold text-deal-ink">
          Aanbiedingen bekijken
        </Link>
      </div>
    );
  }

  const groups = new Map<SupermarketSlug, Offer[]>();
  for (const offer of items) {
    const group = groups.get(offer.source) ?? [];
    group.push(offer);
    groups.set(offer.source, group);
  }
  const grandTotal = items.reduce((sum, o) => sum + (o.pricing.currentPriceCents ?? 0), 0);

  return (
    <div className="mt-6 space-y-8">
      {[...groups.entries()].map(([source, offers]) => {
        const meta = STORE_META[source];
        const subtotal = offers.reduce((s, o) => s + (o.pricing.currentPriceCents ?? 0), 0);
        return (
          <section key={source} className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-line p-4">
              <span
                className="inline-flex h-8 items-center rounded-lg px-2.5 font-display text-sm font-bold"
                style={{ background: meta.bg, color: meta.fg }}
              >
                {meta.name}
              </span>
              <a
                href={meta.offersUrl}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className="rounded-full bg-ink px-4 py-2 font-display text-xs font-bold text-bg transition-opacity hover:opacity-90"
              >
                Open bij {meta.name} ↗
              </a>
            </div>
            <ul className="divide-y divide-line">
              {offers.map((o) => (
                <li key={o.id} className="flex items-center gap-3 p-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">
                    {o.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.imageUrl} alt="" className="h-full w-full object-contain p-1 mix-blend-multiply" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/aanbieding/${offerSlug(o)}`} className="line-clamp-1 font-display text-sm font-medium hover:underline">
                      {o.title}
                    </Link>
                    <p className="font-mono text-[11px] text-ink-soft">
                      {o.pricing.currentPriceCents !== null ? formatEuro(o.pricing.currentPriceCents) : (o.rawLabel ?? "actie")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromBasket(o.id)}
                    aria-label={`${o.title} uit mandje`}
                    className="rounded-full border border-line px-2 py-1 font-mono text-[11px] text-ink-soft transition-colors hover:border-urgent hover:text-urgent"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-line p-4 font-mono text-sm">
              <span className="text-ink-soft">Subtotaal {meta.name}</span>
              <span className="font-bold tabular-nums">{formatEuro(subtotal)}</span>
            </div>
          </section>
        );
      })}

      <div className="flex items-center justify-between rounded-2xl bg-ink px-5 py-4 text-bg">
        <span className="font-mono text-sm">Totaal · {items.length} producten</span>
        <span className="font-display text-xl font-bold tabular-nums">{formatEuro(grandTotal)}</span>
      </div>
      <p className="font-mono text-[11px] leading-relaxed text-ink-soft">
        Prijzen zijn indicatief; sommige acties (1+1, gratis bezorging) hebben geen enkelprijs. Je rekent
        af in de app van de winkel — “Open bij {`{winkel}`}” brengt je erheen.
      </p>
    </div>
  );
}
