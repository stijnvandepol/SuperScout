import type { Metadata } from "next";
import Link from "next/link";
import { getOffers } from "@/lib/offers";
import { decodeList } from "@/lib/list";
import { SharedList } from "@/components/SharedList";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Boodschappenlijst",
  description: "Een gedeelde boodschappenlijst: wat te halen bij welke supermarkt, met de actuele aanbiedingsprijzen.",
  robots: { index: false, follow: false }, // personal shared links shouldn't be indexed
};

type SearchParams = Promise<{ i?: string }>;

export default async function ListPage({ searchParams }: { searchParams: SearchParams }) {
  const { i } = await searchParams;
  const ids = decodeList(i);
  const byId = new Map(getOffers().map((o) => [o.id, o]));
  const offers = ids.map((id) => byId.get(id)).filter((o): o is NonNullable<typeof o> => Boolean(o));
  const missing = ids.length - offers.length;

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
        Gedeelde lijst
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Boodschappenlijst
      </h1>
      <p className="mt-2 font-mono text-sm text-ink-soft">
        Wat te halen bij welke supermarkt — vink af tijdens het boodschappen doen.
      </p>

      {offers.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line py-16 text-center">
          <p className="font-display text-lg">Deze lijst is leeg of verlopen</p>
          <p className="mt-1 font-mono text-xs text-ink-soft">
            De aanbiedingen in deze lijst zijn niet meer geldig.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-full bg-deal px-5 py-2.5 font-display text-sm font-bold text-deal-ink"
          >
            Nieuwe aanbiedingen bekijken
          </Link>
        </div>
      ) : (
        <>
          {missing > 0 ? (
            <p className="mt-4 rounded-xl bg-urgent/10 px-3 py-2 font-mono text-[11px] text-urgent">
              {missing} {missing === 1 ? "product is" : "producten zijn"} niet meer geldig en
              weggelaten.
            </p>
          ) : null}
          <SharedList offers={offers} />
        </>
      )}
    </div>
  );
}
