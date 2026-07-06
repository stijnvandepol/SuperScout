"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Offer, SupermarketSlug } from "@superscout/core";
import { formatEuro, STORE_META } from "@/lib/format";
import { setBasket } from "@/lib/basket";

/** Read-only shopping list grouped per store, with tick-off checkboxes. */
export function SharedList({ offers }: { offers: Offer[] }) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<SupermarketSlug, Offer[]>();
    for (const o of offers) {
      const g = map.get(o.source) ?? [];
      g.push(o);
      map.set(o.source, g);
    }
    return [...map.entries()];
  }, [offers]);

  const grandTotal = offers.reduce((s, o) => s + (o.pricing.currentPriceCents ?? 0), 0);
  const doneCount = offers.filter((o) => checked.has(o.id)).length;

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-ink-soft">
          {offers.length} producten · {groups.length} winkels
          {doneCount > 0 ? ` · ${doneCount} afgevinkt` : ""}
        </p>
        <button
          type="button"
          onClick={() => {
            setBasket(offers.map((o) => o.id));
            setImported(true);
            setTimeout(() => setImported(false), 2500);
          }}
          className="rounded-full border border-line bg-surface px-4 py-2 font-mono text-xs font-bold text-ink-soft transition-colors hover:text-ink"
        >
          {imported ? "In je mandje gezet ✓" : "Zet in mijn mandje"}
        </button>
      </div>

      {groups.map(([source, list]) => {
        const meta = STORE_META[source];
        const subtotal = list.reduce((s, o) => s + (o.pricing.currentPriceCents ?? 0), 0);
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
              {list.map((o) => {
                const isDone = checked.has(o.id);
                return (
                  <li key={o.id}>
                    <label className="flex cursor-pointer items-center gap-3 p-3.5 active:bg-surface-2">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => toggle(o.id)}
                        className="h-5 w-5 shrink-0 accent-fresh"
                      />
                      <span className={`min-w-0 flex-1 font-display text-sm ${isDone ? "text-ink-soft line-through" : ""}`}>
                        <span className="line-clamp-2">{o.title}</span>
                        {o.rawLabel ? (
                          <span className="mt-0.5 block font-mono text-[11px] text-ink-soft">{o.rawLabel}</span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-mono text-xs font-bold tabular-nums text-ink-soft">
                        {o.pricing.currentPriceCents !== null ? formatEuro(o.pricing.currentPriceCents) : "actie"}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-between border-t border-line p-4 font-mono text-sm">
              <span className="text-ink-soft">Subtotaal {meta.name}</span>
              <span className="font-bold tabular-nums">{formatEuro(subtotal)}</span>
            </div>
          </section>
        );
      })}

      <div className="flex items-center justify-between rounded-2xl bg-ink px-5 py-4 text-bg">
        <span className="font-mono text-sm">Totaal · {offers.length} producten</span>
        <span className="font-display text-xl font-bold tabular-nums">{formatEuro(grandTotal)}</span>
      </div>

      <Link
        href="/"
        className="block rounded-2xl border border-line bg-surface p-4 text-center font-display text-sm font-bold transition-colors hover:border-ink/30"
      >
        Zelf aanbiedingen zoeken op SuperScout →
      </Link>
    </div>
  );
}
