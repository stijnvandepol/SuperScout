import type { Metadata } from "next";
import Link from "next/link";
import { getOffers, stats } from "@/lib/offers";
import { STORE_META } from "@/lib/format";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Over SuperScout",
  description:
    "Wat SuperScout is, hoe het werkt en waar het voor staat: alle aanbiedingen van Nederlandse supermarkten, dagelijks ververst, zonder account en zonder tracking.",
};

const PRINCIPLES = [
  {
    title: "Geen account, geen tracking",
    text: "Je hoeft niets aan te maken. Er zijn geen cookies, geen analytics en geen advertenties. Je mandje staat alleen op je eigen apparaat.",
  },
  {
    title: "Elke ochtend vers",
    text: "SuperScout leest elke ochtend de openbare aanbiedingenpagina's van de supermarkten en toont alleen acties die vandaag geldig zijn.",
  },
  {
    title: "Alle winkels gelijk",
    text: "Geen winkel betaalt voor een plek. De volgorde wordt alleen bepaald door jouw zoekopdracht, filters en sortering.",
  },
  {
    title: "Eerlijk over prijzen",
    text: "Groothandelsprijzen (excl. btw) zijn duidelijk gemarkeerd. Klopt een prijs niet? De winkel zelf is altijd leidend.",
  },
];

export default function ProductPage() {
  const offers = getOffers();
  const { total, stores } = stats(offers);
  const storeNames = [...new Set(offers.map((o) => o.source))]
    .sort()
    .map((s) => STORE_META[s].name);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24">
      <header className="pb-10 pt-10 sm:pt-14">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
          Over SuperScout
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Alle supermarkt&shy;aanbiedingen. Eén plek. Nul gedoe.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">
          SuperScout verzamelt elke ochtend de aanbiedingen van {stores} Nederlandse
          supermarkten en groothandels — op dit moment {total} actuele acties — zodat jij in
          seconden de beste deal vindt in plaats van folders door te bladeren.
        </p>
      </header>

      <section className="border-t border-line py-8">
        <h2 className="font-display text-xl font-bold tracking-tight">Zo werkt het</h2>
        <ol className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-soft">
          <li>
            <strong className="text-ink">1. Verzamelen.</strong> Elke ochtend vroeg bezoekt
            SuperScout één keer de openbare aanbiedingenpagina van elke winkel — dezelfde pagina
            die jij in je browser zou openen.
          </li>
          <li>
            <strong className="text-ink">2. Normaliseren.</strong> Elke winkel beschrijft acties
            anders ("1+1 gratis", "2 voor 4,99", "25% korting"). SuperScout vertaalt dat naar één
            vergelijkbaar formaat, met prijzen tot op de cent.
          </li>
          <li>
            <strong className="text-ink">3. Filteren op vandaag.</strong> Acties van volgende week
            of vorige week worden weggelaten — je ziet alleen wat nú geldig is.
          </li>
          <li>
            <strong className="text-ink">4. Jij kiest.</strong> Zoek, filter per winkel of
            categorie, sorteer op prijs of korting, en zet producten in je mandje. Bestellen doe
            je bij de winkel zelf.
          </li>
        </ol>
      </section>

      <section className="border-t border-line py-8">
        <h2 className="font-display text-xl font-bold tracking-tight">Waar we voor staan</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="rounded-2xl border border-line bg-surface p-4">
              <h3 className="font-display text-[15px] font-bold">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{p.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 font-mono text-xs text-ink-soft">
          Meer weten? Lees de <Link href="/ethiek" className="underline underline-offset-2 hover:text-ink">ethiek- &amp; transparantiepagina</Link>,{" "}
          de <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">privacyverklaring</Link> en de{" "}
          <Link href="/voorwaarden" className="underline underline-offset-2 hover:text-ink">algemene voorwaarden</Link>.
        </p>
      </section>

      <section className="border-t border-line py-8">
        <h2 className="font-display text-xl font-bold tracking-tight">De winkels</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{storeNames.join(" · ")}</p>
      </section>

      <section className="border-t border-line py-8">
        <h2 className="font-display text-xl font-bold tracking-tight">Wie maakt dit?</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          SuperScout is een onafhankelijk project van{" "}
          <a
            href="https://stijnvandepol.nl"
            target="_blank"
            rel="noopener me"
            className="font-bold text-ink underline underline-offset-2 hover:text-deal"
          >
            Stijn van de Pol
          </a>
          . Geen investeerders, geen advertentiedeals — gewoon een tool die boodschappen doen
          goedkoper maakt. Vragen of feedback? Neem via die site contact op.
        </p>
      </section>
    </div>
  );
}
