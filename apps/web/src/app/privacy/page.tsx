import type { Metadata } from "next";
import { analyticsConfig } from "@/lib/analytics-config";

// Per request, because one section depends on whether the operator has turned
// analytics on — a privacy statement baked at build time would describe the
// build machine, not the site.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "SuperScout verwerkt geen persoonsgegevens: geen account, geen cookies, geen tracking. Lees hoe je privacy is geregeld.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const analytics = analyticsConfig();
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24">
      <header className="pb-8 pt-10 sm:pt-14">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
          Privacyverklaring
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
          Jouw boodschappen gaan niemand iets aan.
        </h1>
        <p className="mt-4 text-ink-soft">Laatst bijgewerkt: 25 september 2026</p>
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

        {analytics ? (
          <section>
            <h2 className="font-display text-lg font-bold text-ink">
              Geen cookies, geen profielen — wel anonieme tellingen
            </h2>
            <p className="mt-2">
              De site plaatst geen cookies en gebruikt geen advertentienetwerken, tracking­pixels
              of vingerafdruk­technieken. Om te weten welke zoekopdrachten niets opleveren en
              welke functies gebruikt worden, tellen we bezoeken en een paar acties (zoals
              “zoekopdracht”, “gedeeld”, “doorgeklikt naar winkel”) met{" "}
              <strong className="text-ink">Plausible Analytics</strong>. Dat werkt zonder cookies
              en zonder iets op je apparaat op te slaan, bewaart geen IP-adressen en maakt geen
              profiel: we zien alleen totalen, nooit wie wat deed. Daarom is er ook geen
              cookiebanner nodig.
            </p>
          </section>
        ) : (
          <section>
            <h2 className="font-display text-lg font-bold text-ink">Geen cookies, geen tracking</h2>
            <p className="mt-2">
              De site plaatst geen cookies en gebruikt geen analytics, advertentienetwerken,
              tracking­pixels of vingerafdruk­technieken. Daarom zie je ook geen cookiebanner —
              die is simpelweg niet nodig.
            </p>
          </section>
        )}

        <section>
          <h2 className="font-display text-lg font-bold text-ink">
            Je mandje en volglijst blijven op je apparaat
          </h2>
          <p className="mt-2">
            Het winkelmandje en de zoektermen die je volgt worden opgeslagen in de{" "}
            <em>localStorage</em> van je eigen browser. Die gegevens verlaten je apparaat nooit en
            zijn voor ons onzichtbaar. Om te zien wat er nieuw is voor je volglijst, vraagt je
            browser de actuele aanbiedingen per zoekterm op, net als bij gewoon zoeken; wie dat
            vraagt, slaan we niet op. Verwijder je je browserdata, dan zijn mandje en volglijst
            leeg — meer “account verwijderen” is er niet, want er is geen account.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">Als je een fout meldt</h2>
          <p className="mt-2">
            Meld je dat een aanbieding niet klopt, dan bewaren we alleen welke aanbieding het is,
            de reden die je kiest, je eventuele toelichting en het tijdstip (op de minuut). Geen
            naam, geen e-mailadres, geen IP-adres. Om misbruik te beperken onthoudt de server je
            IP-adres tien minuten in zijn werkgeheugen; het wordt nergens opgeslagen. Zet in je
            toelichting liever geen persoonsgegevens.
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
          <h2 className="font-display text-lg font-bold text-ink">Cloudflare zit ertussen</h2>
          <p className="mt-2">
            SuperScout draait achter <strong className="text-ink">Cloudflare</strong>, dat het
            verkeer afhandelt en de site beschermt tegen misbruik. Cloudflare ziet daarbij het
            IP-adres van elke bezoeker en legt dat kortstondig vast — dat hoort bij hoe zo'n
            beveiligingslaag werkt en gebeurt voordat het verzoek ons bereikt. Wij gebruiken die
            gegevens niet en koppelen ze aan niets. We noemen het hier omdat “geen tracking” gaat
            over wat wíj doen, en je hoort te weten wie er nog meer in de keten zit.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold text-ink">Wat we wél bewaren: prijzen</h2>
          <p className="mt-2">
            We leggen dagelijks vast wat producten in de aanbieding kosten, zodat we later kunnen
            laten zien of een actieprijs echt scherp is. Dat gaat uitsluitend over{" "}
            <strong className="text-ink">producten en prijzen</strong> — nooit over personen, en
            het is op geen enkele manier aan een bezoeker gekoppeld. Wie wat bekijkt, bewaren we
            niet; dat kunnen we ook niet, want we meten het niet.
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
