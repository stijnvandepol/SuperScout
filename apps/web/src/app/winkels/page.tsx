import type { Metadata } from "next";
import Link from "next/link";
import { STORE_META } from "@/lib/format";
import { getOffers } from "@/lib/offers";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Alle winkels — SuperScout",
  description: "Bekijk de actuele aanbiedingen per supermarkt: Albert Heijn, Jumbo, Plus en Dirk.",
};

export default function StoresPage() {
  const offers = getOffers();
  const slugs = [...new Set(offers.map((o) => o.source))].sort();
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Winkels</h1>
      <p className="mt-2 font-mono text-sm text-ink-soft">Kies een supermarkt.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {slugs.map((s) => {
          const meta = STORE_META[s];
          const count = offers.filter((o) => o.source === s).length;
          return (
            <Link
              key={s}
              href={`/winkel/${s}`}
              className="flex items-center justify-between rounded-2xl p-4 font-display font-bold"
              style={{ background: meta.bg, color: meta.fg }}
            >
              <span>{meta.name}</span>
              <span className="font-mono text-xs opacity-80">{count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
