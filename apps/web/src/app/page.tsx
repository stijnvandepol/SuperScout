import { OFFERS, stats } from "@/lib/offers";
import { OfferExplorer } from "@/components/OfferExplorer";

export default function Home() {
  const { total, stores } = stats(OFFERS);

  return (
    <div className="mx-auto max-w-6xl px-5">
      <nav className="flex items-center justify-between py-6">
        <span className="font-display text-xl font-bold tracking-tight">
          Super<span className="text-deal">Scout</span>
        </span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
          NL · deze week
        </span>
      </nav>

      <header className="pb-8 pt-6 sm:pt-10">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
          Alle aanbiedingen · één plek
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Nooit meer folders doorbladeren.
          <br />
          <span className="text-ink-soft">Vind de </span>
          <span className="text-deal">beste deal</span>
          <span className="text-ink-soft"> in seconden.</span>
        </h1>
        <p className="mt-5 font-mono text-sm text-ink-soft">
          {total} aanbiedingen · {stores} winkels · Albert Heijn, Jumbo, Plus &amp; Dirk
        </p>
      </header>

      <div className="pb-24">
        <OfferExplorer offers={OFFERS} />
      </div>
    </div>
  );
}
