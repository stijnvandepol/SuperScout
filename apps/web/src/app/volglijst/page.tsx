import type { Metadata } from "next";
import { WatchlistView } from "@/components/WatchlistView";

export const metadata: Metadata = {
  title: "Mijn volglijst",
  description:
    "De zoektermen die je volgt en wat daar sinds je vorige bezoek nieuw bij is gekomen. Zonder account: je lijst staat alleen op dit apparaat.",
  // Personal and empty for every crawler — no search value.
  robots: { index: false, follow: true },
  alternates: { canonical: "/volglijst" },
};

export default function VolglijstPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Mijn volglijst</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        Volg een product, merk of soort boodschap en zie bij elk bezoek wat er nieuw in de
        aanbieding is. Je lijst staat alleen in deze browser — geen account, geen e-mailadres.
      </p>
      <WatchlistView />
    </div>
  );
}
