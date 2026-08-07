"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Offer, SupermarketSlug } from "@superscout/core";
import { planBasket, recommendedTrip } from "@superscout/core";
import { getBasket, onBasketChange, removeFromBasket } from "@/lib/basket";
import { formatEuro, offerSlug, STORE_META } from "@/lib/format";
import { ShareBasketButton } from "./ShareBasketButton";

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
  const plan = planBasket(items);

  return (
    <div className="mt-6 space-y-8">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3.5">
        <p className="font-mono text-xs text-ink-soft">
          Stuur je lijstje door — wat te halen bij welke winkel.
        </p>
        <ShareBasketButton offers={items} />
      </div>

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
                      <img src={o.imageUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain p-1 mix-blend-multiply" />
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
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line font-mono text-sm text-ink-soft transition-colors hover:border-urgent hover:text-urgent"
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

      <div className="rounded-2xl bg-ink px-5 py-4 text-bg">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm">Totaal · {items.length} producten</span>
          <span className="font-display text-xl font-bold tabular-nums">{formatEuro(grandTotal)}</span>
        </div>
        {plan.savingsCents > 0 ? (
          <div className="mt-2 flex items-center justify-between border-t border-bg/20 pt-2">
            <span className="font-mono text-xs text-bg/70">Je bespaart</span>
            <span className="font-mono text-sm font-bold tabular-nums text-bg/90">
              {formatEuro(plan.savingsCents)}
            </span>
          </div>
        ) : null}
      </div>

      <TripAdvice plan={plan} />
      <p className="font-mono text-[11px] leading-relaxed text-ink-soft">
        Prijzen zijn indicatief; sommige acties (1+1, gratis bezorging) hebben geen enkelprijs. Je rekent
        af in de app van de winkel — “Open bij {`{winkel}`}” brengt je erheen.
      </p>
    </div>
  );
}

/**
 * "You don't have to visit all five."
 *
 * Grouping by chain answers *where* things are; this answers whether the extra
 * trip is worth making. Only shown when dropping a stop keeps most of the
 * saving — otherwise it would nag about a choice that is already fine.
 */
function TripAdvice({ plan }: { plan: ReturnType<typeof planBasket> }) {
  const trip = recommendedTrip(plan);
  if (!trip || trip.savingsCents <= 0) return null;

  const skipped = plan.stores.length - trip.stops;
  const missed = plan.savingsCents - trip.savingsCents;
  const names = trip.sources.map((s) => STORE_META[s].name);
  const listed =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} en ${names.at(-1)}`;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-display text-base font-bold tracking-tight">
        Minder winkels, bijna hetzelfde voordeel
      </h2>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
        Je mandje ligt verspreid over {plan.stores.length} winkels. Ga je alleen naar{" "}
        <strong className="text-ink">{listed}</strong>, dan pak je{" "}
        <strong className="text-ink">{trip.savingsShare}%</strong> van je voordeel mee —{" "}
        {formatEuro(trip.savingsCents)} van {formatEuro(plan.savingsCents)} — met{" "}
        {skipped === 1 ? "één winkel" : `${skipped} winkels`} minder.
        {missed > 0 ? ` Je laat dan ${formatEuro(missed)} liggen.` : ""}
      </p>
      <p className="mt-3 font-mono text-[11px] text-ink-soft">
        {trip.itemsCovered} van je {plan.itemCount} producten liggen bij deze{" "}
        {trip.stops === 1 ? "winkel" : "winkels"}.
      </p>
    </section>
  );
}
