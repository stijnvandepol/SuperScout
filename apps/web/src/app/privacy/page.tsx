import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "SuperScout verwerkt geen persoonsgegevens: geen account, geen cookies, geen tracking. Lees hoe je privacy is geregeld.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24">
      <header className="pb-8 pt-10 sm:pt-14">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
          Privacyverklaring
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
          Jouw boodschappen gaan niemand iets aan.
        </h1>
        <p className="mt-4 text-ink-soft">Laatst bijgewerkt: 6 juli 2026</p>
      </header>

      <div className="space-y-8 border-t border-line pt-8 text-[15px] leading-relaxed text-ink-soft">
        <section>
          <h2 className="font-display text-lg font-bold text-ink">Geen persoonsgegevens</h2>
          <p className="mt-2">
            SuperScout heeft geen accounts, geen registratie en geen profielen. We vragen nooit om
            je naam, e-mailadres of andere persoonsgegevens en slaan die dus ook niet op. Er is
            geen database met gebruikers.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">Geen cookies, geen tracking</h2>
          <p className="mt-2">
            De site plaatst geen cookies en gebruikt geen analytics, advertentienetwerken,
            tracking­pixels of vingerafdruk­technieken. Daarom zie je ook geen cookiebanner —
            die is simpelweg niet nodig.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">Je mandje blijft op je apparaat</h2>
          <p className="mt-2">
            Het winkelmandje wordt opgeslagen in de <em>localStorage</em> van je eigen browser.
            Die gegevens verlaten je apparaat nooit en zijn voor ons onzichtbaar. Verwijder je je
            browserdata, dan is je mandje leeg.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">Productafbeeldingen van winkels</h2>
          <p className="mt-2">
            Productfoto's laden rechtstreeks van de servers van de betreffende supermarkt. Zo'n
            server ziet daarbij — zoals bij elk plaatje op internet — je IP-adres. We sturen
            daarbij bewust géén referrer mee, zodat de winkel niet kan zien welke pagina je op
            SuperScout bekijkt.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">Technische serverlogs</h2>
          <p className="mt-2">
            Zoals elke webserver houdt onze server kortstondig technische logs bij (zoals
            IP-adres en opgevraagde pagina) voor beveiliging en foutopsporing. Deze logs worden
            niet gebruikt voor profilering, niet gedeeld en niet verkocht.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">Vragen?</h2>
          <p className="mt-2">
            Neem contact op via{" "}
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
