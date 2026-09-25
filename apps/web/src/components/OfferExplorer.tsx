"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { CardOffer, CategorySlug, SupermarketSlug } from "@superscout/core";
import { categorizeOffer, CATEGORIES, CATEGORY_LABEL, isExpiringSoon } from "@superscout/core";
import { isExVat, STORE_META } from "@/lib/format";
import { normalizeTerm, offerMatches } from "@/lib/search";
import { countBucket, track } from "@/lib/analytics";
import {
  getWatchlist,
  isWatched,
  onWatchlistChange,
  unseen,
  unwatchTerm,
  watchTerm,
  type WatchedTerm,
} from "@/lib/watchlist";
import { OfferCard } from "./OfferCard";

type SortKey = "relevant" | "price-asc" | "price-desc" | "discount";

export function OfferExplorer({
  offers,
  nowIso,
  stat,
  dataDate = null,
}: {
  offers: CardOffer[];
  dataDate?: string | null;
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

  // Typing stays instant on a slow phone: the input updates at once, the
  // filter over ~1.000 offers catches up when the browser has time (INP).
  const deferredQuery = useDeferredValue(query);

  // Deep links: /?q=koffie&winkel=ah&categorie=zuivel. The sitelinks searchbox
  // uses `q`; the rest makes a filtered view something you can share or
  // bookmark. All variants canonicalise to "/", so this adds no crawlable URLs.
  const hydrated = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const winkel = params.get("winkel");
    const categorie = params.get("categorie");
    if (q) setQuery(q);
    if (winkel && offers.some((o) => o.source === winkel)) setStore(winkel as SupermarketSlug);
    if (categorie && CATEGORIES.some((c) => c.slug === categorie)) {
      setCategory(categorie as CategorySlug);
    }
    // Read once, on arrival; afterwards the state is the source of truth.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror the filters back into the address bar, without a navigation. The
  // first run is skipped: it sees the pre-hydration defaults and would wipe
  // the very parameters the effect above is still applying.
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const params = new URLSearchParams();
    const q = normalizeTerm(deferredQuery);
    if (q) params.set("q", q);
    if (store) params.set("winkel", store);
    if (category) params.set("categorie", category);
    const search = params.toString();
    const next = `${window.location.pathname}${search ? `?${search}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [deferredQuery, store, category]);

  // Precompute each offer's category once.
  const catOf = useMemo(() => new Map(offers.map((o) => [o.id, categorizeOffer(o)])), [offers]);

  const stores = useMemo(() => [...new Set(offers.map((o) => o.source))].sort(), [offers]);
  const categories = useMemo(() => {
    const present = new Set(catOf.values());
    return CATEGORIES.filter((c) => present.has(c.slug));
  }, [catOf]);

  const filtered = useMemo(() => {
    const needle = normalizeTerm(deferredQuery);
    return offers.filter((o) => {
      if (category && catOf.get(o.id) !== category) return false;
      if (store && o.source !== store) return false;
      if (expiringOnly && !isExpiringSoon(o.validUntil, nowIso)) return false;
      if (exVatOnly && !isExVat(o.source)) return false;
      if (needle && !offerMatches(o, needle)) return false;
      return true;
    });
  }, [offers, catOf, deferredQuery, category, store, expiringOnly, exVatOnly, nowIso]);

  // One event per settled search, not per keystroke. The result count is
  // bucketed: "0" is the number that matters — it is demand we do not meet.
  useEffect(() => {
    const term = normalizeTerm(deferredQuery);
    if (term.length < 2) return;
    const timer = setTimeout(
      () => track("Zoekopdracht", { term, resultaten: countBucket(filtered.length) }),
      1500,
    );
    return () => clearTimeout(timer);
  }, [deferredQuery, filtered.length]);

  const hasExVat = useMemo(() => offers.some((o) => isExVat(o.source)), [offers]);

  const sorted = useMemo(() => {
    const price = (o: CardOffer) => o.pricing.currentPriceCents;
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
  useEffect(() => setLimit(48), [deferredQuery, category, store, expiringOnly, exVatOnly, sort]);
  const visible = sorted.slice(0, limit);

  const term = normalizeTerm(deferredQuery);

  return (
    <section>
      <WatchlistNews offers={offers} />

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

      {/* Filters — compact dropdowns keep the page calm (no chip walls) */}
      <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
        <FilterSelect
          label="Winkel"
          value={store ?? ""}
          onChange={(v) => {
            setStore((v || null) as SupermarketSlug | null);
            if (v) track("Filter", { soort: "winkel", waarde: v });
          }}
        >
          <option value="">Alle winkels</option>
          {stores.map((s) => (
            <option key={s} value={s}>
              {STORE_META[s].name}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Categorie"
          value={category ?? ""}
          onChange={(v) => {
            setCategory((v || null) as CategorySlug | null);
            if (v) track("Filter", { soort: "categorie", waarde: v });
          }}
        >
          <option value="">Alle categorieën</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {CATEGORY_LABEL[c.slug]}
            </option>
          ))}
        </FilterSelect>

        <FilterSelect label="Sorteren" value={sort} onChange={(v) => setSort(v as SortKey)}>
          <option value="relevant">Sorteer: relevantie</option>
          <option value="price-asc">Prijs: laag → hoog</option>
          <option value="price-desc">Prijs: hoog → laag</option>
          <option value="discount">Hoogste korting</option>
        </FilterSelect>

        <button
          type="button"
          onClick={() => setExpiringOnly((v) => !v)}
          aria-pressed={expiringOnly}
          className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-urgent ${
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
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
              exVatOnly ? "bg-ink text-bg" : "border border-line bg-surface text-ink-soft hover:text-ink"
            }`}
          >
            Excl. btw
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-xs text-ink-soft" aria-live="polite">
          {stat && !query && !category && !store && !expiringOnly && !exVatOnly
            ? stat
            : `${filtered.length} ${filtered.length === 1 ? "aanbieding" : "aanbiedingen"}`}
        </p>
        {term.length >= 2 ? (
          <FollowButton term={term} matchIds={filtered.map((o) => o.id)} />
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line px-6 py-14 text-center">
          <p className="font-display text-lg">
            {term ? `Deze week geen aanbiedingen voor “${term}”` : "Niets gevonden"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            {term
              ? "Volg deze zoekterm: zodra een winkel er een actie op zet, zie je het hier bij je volgende bezoek."
              : "Pas je zoekopdracht of filters aan."}
          </p>
          {category || store || expiringOnly || exVatOnly ? (
            <button
              type="button"
              onClick={() => {
                setCategory(null);
                setStore(null);
                setExpiringOnly(false);
                setExVatOnly(false);
              }}
              className="mt-4 rounded-full border border-line px-4 py-2 font-mono text-xs font-bold hover:border-ink"
            >
              Wis filters
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {visible.map((o, i) => (
              // The first card is the LCP candidate on the homepage, so it
              // loads eagerly instead of waiting for the lazy-load pass.
              <OfferCard key={o.id} offer={o} nowIso={nowIso} dataDate={dataDate} priority={i === 0} />
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

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  const id = `filter-${label.toLowerCase()}`;
  return (
    <div className="relative shrink-0">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-full border border-line bg-surface py-2 pl-4 pr-9 font-mono text-xs font-bold text-ink outline-none transition-colors hover:border-ink/30 focus-visible:ring-2 focus-visible:ring-deal"
      >
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-soft"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      >
        <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/**
 * "Volg deze zoekterm" — the account-free price alert.
 *
 * The ids on screen are stored as already seen, so the first thing the
 * visitor hears back is genuinely new, not the list they were just reading.
 */
function FollowButton({ term, matchIds }: { term: string; matchIds: string[] }) {
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    const read = () => setWatching(isWatched(term));
    read();
    return onWatchlistChange(read);
  }, [term]);

  return (
    <button
      type="button"
      aria-pressed={watching}
      onClick={() => {
        if (watching) {
          unwatchTerm(term);
          return;
        }
        if (watchTerm(term, matchIds)) track("Volg zoekterm", { term });
      }}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deal ${
        watching ? "bg-fresh/10 text-fresh" : "border border-line bg-surface text-ink hover:border-ink/40"
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" strokeLinejoin="round" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" strokeLinecap="round" />
      </svg>
      {watching ? `Je volgt “${term}”` : `Volg “${term}”`}
    </button>
  );
}

/**
 * The return-visit payoff: what is new for the terms you follow.
 *
 * Computed from the offers already on the page, so it costs no request. It
 * deliberately does not mark anything as seen — only opening the watchlist
 * does — so the banner stays until the visitor has actually looked.
 */
function WatchlistNews({ offers }: { offers: CardOffer[] }) {
  const [list, setList] = useState<WatchedTerm[]>([]);

  useEffect(() => {
    const read = () => setList(getWatchlist());
    read();
    return onWatchlistChange(read);
  }, []);

  const news = useMemo(
    () =>
      list
        .map((entry) => ({
          term: entry.term,
          count: unseen(
            entry,
            offers.filter((o) => offerMatches(o, entry.term)).map((o) => o.id),
          ).length,
        }))
        .filter((n) => n.count > 0),
    [list, offers],
  );

  if (news.length === 0) return null;
  const total = news.reduce((sum, n) => sum + n.count, 0);

  return (
    <Link
      href="/volglijst"
      className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-fresh/30 bg-fresh/10 px-4 py-3 text-sm transition-colors hover:border-fresh"
    >
      <span>
        <strong className="font-display">
          {total} {total === 1 ? "nieuwe aanbieding" : "nieuwe aanbiedingen"}
        </strong>{" "}
        <span className="text-ink-soft">
          voor {news.slice(0, 3).map((n) => `“${n.term}”`).join(", ")}
          {news.length > 3 ? ` en ${news.length - 3} meer` : ""}
        </span>
      </span>
      <span className="shrink-0 font-mono text-xs font-bold text-fresh">Bekijk →</span>
    </Link>
  );
}
