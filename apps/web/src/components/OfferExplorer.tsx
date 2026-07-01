"use client";

import { useMemo, useState } from "react";
import type { MechanismType, Offer, SupermarketSlug } from "@superscout/core";
import { isExpiringSoon } from "@superscout/core";
import { MECHANISM_LABEL, STORE_META } from "@/lib/format";
import { OfferCard } from "./OfferCard";

export function OfferExplorer({ offers, nowIso }: { offers: Offer[]; nowIso: string }) {
  const [query, setQuery] = useState("");
  const [store, setStore] = useState<SupermarketSlug | null>(null);
  const [mechanism, setMechanism] = useState<MechanismType | null>(null);
  const [expiringOnly, setExpiringOnly] = useState(false);

  const stores = useMemo(
    () => [...new Set(offers.map((o) => o.source))].sort(),
    [offers],
  );
  const mechanisms = useMemo(
    () => [...new Set(offers.map((o) => o.mechanism.type))].sort(),
    [offers],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return offers.filter((o) => {
      if (store && o.source !== store) return false;
      if (mechanism && o.mechanism.type !== mechanism) return false;
      if (expiringOnly && !isExpiringSoon(o.validUntil, nowIso)) return false;
      if (needle) {
        const hay = `${o.title} ${o.brand ?? ""} ${o.sourceCategoryRaw ?? ""} ${o.rawLabel ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [offers, query, store, mechanism, expiringOnly, nowIso]);

  return (
    <section>
      {/* Search — the hero's job */}
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
          placeholder="Zoek op product, merk of winkel…"
          aria-label="Zoek aanbiedingen"
          className="w-full rounded-2xl border border-line bg-surface py-4 pl-14 pr-5 font-display text-lg outline-none transition-colors placeholder:text-ink-soft/70 focus:border-deal focus:ring-4 focus:ring-deal/20"
        />
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Chip active={store === null} onClick={() => setStore(null)}>
          Alle winkels
        </Chip>
        {stores.map((s) => (
          <Chip key={s} active={store === s} onClick={() => setStore(store === s ? null : s)}>
            {STORE_META[s].name}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Chip active={mechanism === null} onClick={() => setMechanism(null)} subtle>
          Alle acties
        </Chip>
        {mechanisms.map((m) => (
          <Chip
            key={m}
            active={mechanism === m}
            onClick={() => setMechanism(mechanism === m ? null : m)}
            subtle
          >
            {MECHANISM_LABEL[m]}
          </Chip>
        ))}
        <button
          type="button"
          onClick={() => setExpiringOnly((v) => !v)}
          className={`rounded-full px-3.5 py-1.5 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-urgent ${
            expiringOnly
              ? "bg-urgent text-white"
              : "border border-urgent/40 bg-surface text-urgent hover:bg-urgent/5"
          }`}
        >
          Bijna verlopen
        </button>
      </div>

      <p className="mt-6 font-mono text-xs text-ink-soft">
        {filtered.length} van {offers.length} aanbiedingen
      </p>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line py-16 text-center">
          <p className="font-display text-lg">Niets gevonden</p>
          <p className="mt-1 font-mono text-xs text-ink-soft">
            Pas je zoekopdracht of filters aan.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((o) => (
            <OfferCard key={o.id} offer={o} nowIso={nowIso} />
          ))}
        </div>
      )}
    </section>
  );
}

function Chip({
  active,
  subtle = false,
  onClick,
  children,
}: {
  active: boolean;
  subtle?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base =
    "rounded-full px-3.5 py-1.5 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deal";
  if (active) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} ${subtle ? "bg-ink text-bg" : "bg-deal text-deal-ink"}`}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} border border-line bg-surface text-ink-soft hover:text-ink`}
    >
      {children}
    </button>
  );
}
