import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ethiek & transparantie",
  description:
    "Hoe SuperScout aan zijn data komt, waarom alle winkels gelijk worden behandeld en welke keuzes we bewust maken.",
};

export default function EthiekPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24">
      <header className="pb-8 pt-10 sm:pt-14">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
          Ethiek &amp; transparantie
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
          Eerlijk vergelijken begint bij eerlijk werken.
        </h1>
      </header>

      <div className="space-y-8 border-t border-line pt-8 text-[15px] leading-relaxed text-ink-soft">
        <section>
          <h2 className="font-display text-lg font-bold text-ink">Waar de data vandaan komt</h2>
          <p className="mt-2">
            Alle aanbiedingen komen van de <strong className="text-ink">openbare</strong>{" "}
            aanbiedingenpagina's van de winkels zelf — dezelfde pagina's die iedereen in een
            browser kan bekijken. We gebruiken geen besloten systemen, omzeilen geen betaalmuren
            en verzamelen geen gegevens over personen.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">Minimale belasting</h2>
          <p className="mt-2">
            SuperScout bezoekt elke winkel <strong className="text-ink">één keer per dag</strong>,
            's ochtends vroeg — vergelijkbaar met één bezoeker die de folder bekijkt. We hameren
            niet op servers en respecteren de infrastructuur van de winkels.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">Geen betaalde rangschikking</h2>
          <p className="mt-2">
            Geen enkele winkel betaalt voor plaatsing, volgorde of uitlichting. Er zijn geen
            advertenties, geen affiliate-vergoedingen en geen gesponsorde resultaten. De volgorde
            op de site wordt uitsluitend bepaald door jouw zoekopdracht, filters en sortering.
            Verdient SuperScout ergens aan? Nee — het is een onafhankelijk project zonder
            verdienmodel.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">Eerlijk over onzekerheid</h2>
          <p className="mt-2">
            Automatisch overgenomen data kan fouten bevatten: een gewijzigde actie, een afwijkende
            prijs, een verlopen aanbieding. We filteren op geldigheid per dag en markeren
            groothandelsprijzen (excl. btw), maar we pretenderen geen perfectie —{" "}
            <strong className="text-ink">de winkel is altijd leidend</strong>. Zie ook de{" "}
            <a href="/voorwaarden" className="underline underline-offset-2 hover:text-ink">
              algemene voorwaarden
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">Privacy als uitgangspunt</h2>
          <p className="mt-2">
            De beste bescherming van jouw gegevens is ze niet verzamelen. Daarom werkt SuperScout
            zonder account, zonder cookies en zonder tracking. Lees de volledige{" "}
            <a href="/privacy" className="underline underline-offset-2 hover:text-ink">
              privacyverklaring
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">Aanspreekbaar</h2>
          <p className="mt-2">
            Ben je een winkel en heb je bezwaar tegen opname, of zie je iets dat niet klopt? Neem
            contact op via{" "}
            <a
              href="https://stijnvandepol.nl"
              target="_blank"
              rel="noopener"
              className="font-bold text-ink underline underline-offset-2 hover:text-deal"
            >
              stijnvandepol.nl
            </a>{" "}
            — dan lossen we het op.
          </p>
        </section>
      </div>
    </div>
  );
}
