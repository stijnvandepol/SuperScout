import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Algemene voorwaarden",
  description:
    "De spelregels van SuperScout: een gratis, informatieve aanbiedingen-vergelijker. De winkel is altijd leidend voor de definitieve prijs.",
};

export default function VoorwaardenPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24">
      <header className="pb-8 pt-10 sm:pt-14">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
          Algemene voorwaarden
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
          Duidelijke spelregels, geen kleine lettertjes.
        </h1>
        <p className="mt-4 text-ink-soft">Laatst bijgewerkt: 6 juli 2026</p>
      </header>

      <div className="space-y-8 border-t border-line pt-8 text-[15px] leading-relaxed text-ink-soft">
        <section>
          <h2 className="font-display text-lg font-bold text-ink">1. Wat SuperScout is</h2>
          <p className="mt-2">
            SuperScout is een gratis, informatieve dienst die actuele aanbiedingen van Nederlandse
            supermarkten en groothandels op één plek toont. SuperScout verkoopt zelf niets: kopen
            doe je altijd rechtstreeks bij de winkel.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">2. Prijzen en acties</h2>
          <p className="mt-2">
            Aanbiedingen worden dagelijks automatisch overgenomen van de openbare
            aanbiedingenpagina's van de winkels. We doen dit zo zorgvuldig mogelijk, maar prijzen,
            actievoorwaarden en looptijden kunnen tussentijds wijzigen of fouten bevatten.{" "}
            <strong className="text-ink">
              De informatie van de winkel zelf is altijd leidend
            </strong>
            ; aan de weergave op SuperScout kunnen geen rechten worden ontleend.
          </p>
          <p className="mt-2">
            Bij groothandels (zoals Sligro) zijn prijzen exclusief btw; dit staat er duidelijk bij
            vermeld.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">3. Merken en afbeeldingen</h2>
          <p className="mt-2">
            Winkelnamen, merken en productafbeeldingen zijn eigendom van hun respectieve
            eigenaren en worden uitsluitend informatief getoond, om je te helpen een aanbieding te
            herkennen. SuperScout heeft geen commerciële relatie met de getoonde winkels en
            ontvangt geen vergoeding voor doorverwijzingen.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">4. Beschikbaarheid</h2>
          <p className="mt-2">
            SuperScout wordt aangeboden zoals het is ("as is"), zonder garantie op
            beschikbaarheid of volledigheid. We doen ons best de dienst en de data actueel te
            houden, maar kunnen onderbrekingen of ontbrekende winkels niet uitsluiten.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">5. Aansprakelijkheid</h2>
          <p className="mt-2">
            SuperScout is niet aansprakelijk voor schade die voortvloeit uit het gebruik van de
            getoonde informatie, waaronder gemiste of afwijkende aanbiedingen. Controleer de
            actie altijd bij de winkel voordat je koopt.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">6. Wijzigingen en contact</h2>
          <p className="mt-2">
            Deze voorwaarden kunnen worden bijgewerkt; de datum bovenaan geeft de laatste versie
            aan. Vragen? Neem contact op via{" "}
            <a
              href="https://stijnvandepol.nl"
              target="_blank"
              rel="noopener"
              className="font-bold text-ink underline underline-offset-2 hover:text-deal"
            >
              stijnvandepol.nl
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
