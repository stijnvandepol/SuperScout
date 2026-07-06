"use client";

import { useEffect, useMemo, useState } from "react";
import type { CategorySlug, Offer, SupermarketSlug } from "@superscout/core";
import { categorizeOffer, CATEGORIES, CATEGORY_LABEL, isExpiringSoon } from "@superscout/core";
import { isExVat, STORE_META } from "@/lib/format";
import { OfferCard } from "./OfferCard";

type SortKey = "relevant" | "price-asc" | "price-desc" | "discount";

export function OfferExplorer({
  offers,
  nowIso,
  stat,
}: {
  offers: Offer[];
  nowIso: string;
  stat?: string;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategorySlug | null>(null);
  const [store, setStore] = useState<SupermarketSlug | null>(null);
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [exVatOnly, setExVatOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("relevant");
  const [limit, setLimit] = useState(48);

  // Precompute each offer's category once.
  const catOf = useMemo(() => new Map(offers.map((o) => [o.id, categorizeOffer(o)])), [offers]);

  const stores = useMemo(() => [...new Set(offers.map((o) => o.source))].sort(), [offers]);
  const categories = useMemo(() => {
    const present = new Set(catOf.values());
    return CATEGORIES.filter((c) => present.has(c.slug));
  }, [catOf]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return offers.filter((o) => {
      if (category && catOf.get(o.id) !== category) return false;
      if (store && o.source !== store) return false;
      if (expiringOnly && !isExpiringSoon(o.validUntil, nowIso)) return false;
      if (exVatOnly && !isExVat(o.source)) return false;
      if (needle) {
        const hay = `${o.title} ${o.brand ?? ""} ${o.sourceCategoryRaw ?? ""} ${o.rawLabel ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [offers, catOf, query, category, store, expiringOnly, exVatOnly, nowIso]);

  const hasExVat = useMemo(() => offers.some((o) => isExVat(o.source)), [offers]);

  const sorted = useMemo(() => {
    const price = (o: Offer) => o.pricing.currentPriceCents;
    const arr = [...filtered];
    switch (sort) {
      case "price-asc":
        // Offers without a unit price (1+1, "2 voor…") sort last.
        return arr.sort((a, b) => (price(a) ?? Infinity) - (price(b) ?? Infinity));
      case "price-desc":
        return arr.sort((a, b) => (price(b) ?? -1) - (price(a) ?? -1));
      case "discount":
        return arr.sort((a, b) => (b.pricing.savingsPercent ?? 0) - (a.pricing.savingsPercent ?? 0));
      default:
        return arr;
    }
  }, [filtered, sort]);

  // Reset the render window whenever the result set or ordering changes.
  useEffect(() => setLimit(48), [query, category, store, expiringOnly, exVatOnly, sort]);
  const visible = sorted.slice(0, limit);

  return (
    <section>
      {/* Search */}
      <div className="relative">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek een product…"
          aria-label="Zoek aanbiedingen"
          className="w-full rounded-2xl border border-line bg-surface py-4 pl-14 pr-5 font-display text-lg outline-none transition-colors placeholder:text-ink-soft/70 focus:border-deal focus:ring-4 focus:ring-deal/20"
        />
      </div>

      {/* Store logos — tap to filter to a supermarket */}
      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
        <button
          type="button"
          onClick={() => setStore(null)}
          aria-pressed={store === null}
          className={`shrink-0 rounded-full border px-4 py-2 font-display text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
            store === null ? "border-ink bg-ink text-bg" : "border-line bg-surface text-ink-soft hover:text-ink"
          }`}
        >
          Alle
        </button>
        {stores.map((s) => {
          const active = store === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStore(active ? null : s)}
              aria-pressed={active}
              aria-label={STORE_META[s].name}
              className={`shrink-0 rounded-full px-4 py-2 font-display text-sm font-bold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                active ? "ring-2 ring-ink ring-offset-2 ring-offset-bg" : store ? "opacity-45 hover:opacity-100" : ""
              }`}
              style={{ background: STORE_META[s].bg, color: STORE_META[s].fg }}
            >
              {STORE_META[s].name}
            </button>
          );
        })}
      </div>

      {/* Categories */}
      <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip active={category === null} onClick={() => setCategory(null)}>
          Alles
        </Chip>
        {categories.map((c) => (
          <Chip
            key={c.slug}
            active={category === c.slug}
            onClick={() => setCategory(category === c.slug ? null : c.slug)}
          >
            {CATEGORY_LABEL[c.slug]}
          </Chip>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs text-ink-soft">
          {stat && !query && !category && !store && !expiringOnly && !exVatOnly
            ? stat
            : `${filtered.length} ${filtered.length === 1 ? "aanbieding" : "aanbiedingen"}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="sort">
            Sorteren
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="shrink-0 rounded-full border border-line bg-surface px-3.5 py-1.5 font-mono text-xs font-bold text-ink-soft outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-deal"
          >
            <option value="relevant">Sorteer: relevantie</option>
            <option value="price-asc">Prijs: laag → hoog</option>
            <option value="price-desc">Prijs: hoog → laag</option>
            <option value="discount">Hoogste korting</option>
          </select>
          <button
            type="button"
            onClick={() => setExpiringOnly((v) => !v)}
            aria-pressed={expiringOnly}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-urgent ${
              expiringOnly ? "bg-urgent text-white" : "border border-urgent/40 bg-surface text-urgent hover:bg-urgent/5"
            }`}
          >
            Bijna verlopen
          </button>
          {hasExVat ? (
            <button
              type="button"
              onClick={() => setExVatOnly((v) => !v)}
              aria-pressed={exVatOnly}
              title="Toon alleen groothandel-aanbiedingen (prijzen excl. btw)"
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
                exVatOnly ? "bg-ink text-bg" : "border border-line bg-surface text-ink-soft hover:text-ink"
              }`}
            >
              Excl. btw
            </button>
          ) : null}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line py-16 text-center">
          <p className="font-display text-lg">Niets gevonden</p>
          <p className="mt-1 font-mono text-xs text-ink-soft">Pas je zoekopdracht of filters aan.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((o) => (
              <OfferCard key={o.id} offer={o} nowIso={nowIso} />
            ))}
          </div>
          {filtered.length > visible.length ? (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setLimit((l) => l + 48)}
                className="rounded-full bg-ink px-6 py-3 font-display text-sm font-bold text-bg transition-opacity hover:opacity-90"
              >
                Toon meer ({filtered.length - visible.length})
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base =
    "shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deal";
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? `${base} bg-deal text-deal-ink`
          : `${base} border border-line bg-surface text-ink-soft hover:text-ink`
      }
    >
      {children}
    </button>
  );
}
