import type { Metadata } from "next";
import Link from "next/link";
import type { Offer, SupermarketSlug } from "@superscout/core";
import { cycleStartsBySource } from "@superscout/core";
import { dataFetchedAt, getOffers, upcomingOffers } from "@/lib/offers";
import { STORE_META, validUntilShort } from "@/lib/format";
import { OfferGrid } from "@/components/OfferGrid";
import { JsonLd } from "@/components/JsonLd";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  offerListJsonLd,
  SITE_FEED_ALTERNATE,
  SITE_URL,
} from "@/lib/seo";
import { offerSlug } from "@/lib/format";

export const revalidate = 1800;

const TITLE = "Supermarkt aanbiedingen volgende week";
const DESCRIPTION =
  "De aanbiedingen van volgende week, zodra de supermarkten ze publiceren. Plus per keten wanneer de nieuwe folder verschijnt, zodat je weet wanneer je kunt kijken.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/volgende-week", types: SITE_FEED_ALTERNATE },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "nl_NL",
    url: "/volgende-week",
  },
};

const FAQ = [
  {
    q: "Wanneer komen de supermarktaanbiedingen van volgende week online?",
    aText:
      "Dat verschilt per keten. Albert Heijn en Lidl beginnen hun week op maandag, Jumbo, PLUS en Dirk op woensdag. De folder verschijnt meestal een paar dagen voor de startdatum, dus vanaf donderdag of vrijdag staan de eerste acties van de week erna online.",
  },
  {
    q: "Kan ik aanbiedingen van volgende week al bestellen?",
    aText:
      "Nee. Een aanbieding geldt pas vanaf de startdatum. Wat je vooraf kunt zien is welke producten in de actie gaan, zodat je je boodschappen kunt plannen en niet vandaag iets koopt dat over twee dagen in de bonus is.",
  },
  {
    q: "Waarom staat niet elke supermarkt hier?",
    aText:
      "Niet elke keten publiceert de folder van volgende week vooruit. Zodra een supermarkt de nieuwe acties online zet, haalt SuperScout ze binnen en verschijnen ze op deze pagina.",
  },
  {
    q: "Verdwijnen aanbiedingen zodra ze aflopen?",
    aText:
      "Ja. Zodra een actie voorbij is verdwijnt hij uit het overzicht — een afgelopen aanbieding tonen levert alleen verwarring op. Wel onthouden we op de achtergrond wat een product eerder kostte, zodat we bij een volgende actie kunnen zeggen of de korting echt scherp is.",
  },
];

/** Group upcoming offers by their start date, soonest first. */
function byStartDate(offers: Offer[]): { date: string; offers: Offer[] }[] {
  const groups = new Map<string, Offer[]>();
  for (const offer of offers) {
    const date = offer.validFrom.slice(0, 10);
    const list = groups.get(date);
    if (list) list.push(offer);
    else groups.set(date, [offer]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({ date, offers: list }));
}

function dutchDate(iso: string): string {
  const parsed = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed)) return iso;
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(parsed));
}

export default function NextWeekPage() {
  const nowIso = new Date().toISOString();
  const upcoming = upcomingOffers();
  const groups = byStartDate(upcoming);

  // Derived from the live set rather than a hardcoded table: chains do change
  // their cycle, and a stale table on a page whose entire premise is "when"
  // would be worse than saying nothing.
  const cycles = cycleStartsBySource(getOffers());
  const chains = [...cycles.entries()]
    .filter(([source]) => source in STORE_META)
    .sort(([a], [b]) =>
      STORE_META[a as SupermarketSlug].name.localeCompare(STORE_META[b as SupermarketSlug].name, "nl"),
    );

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 pb-24">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Volgende week", path: "/volgende-week" },
        ])}
      />
      <JsonLd data={faqJsonLd(`${SITE_URL}/volgende-week#faq`, FAQ)} />
      {upcoming.length > 0 ? (
        <JsonLd
          data={offerListJsonLd({
            name: TITLE,
            description: DESCRIPTION,
            url: `${SITE_URL}/volgende-week`,
            offers: upcoming,
            slugOf: offerSlug,
          })}
        />
      ) : null}

      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Supermarkt aanbiedingen volgende week
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        Supermarkten zetten hun nieuwe folder een paar dagen voor de startdatum online. Alles wat al
        gepubliceerd is maar nog niet is begonnen, staat hieronder — zodat je weet wat er aankomt
        voordat je vandaag boodschappen doet.
      </p>

      {groups.length > 0 ? (
        groups.map((group) => (
          <section key={group.date} className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
              <h2 className="font-display text-xl font-bold tracking-tight">
                Vanaf {dutchDate(group.date)}
              </h2>
              <span className="font-mono text-xs text-ink-soft">
                {group.offers.length} {group.offers.length === 1 ? "aanbieding" : "aanbiedingen"}
              </span>
            </div>
            <div className="mt-5">
              <OfferGrid offers={group.offers} nowIso={nowIso} dataDate={dataFetchedAt()} />
            </div>
          </section>
        ))
      ) : (
        <EmptyState />
      )}

      {/* Rendered whether or not there are upcoming offers. The page has to
          answer "when can I look" even in the window where every chain's folder
          is current — otherwise it flips between substantial and empty each
          week, and Google re-evaluates it as thin on the empty days. */}
      <section className="mt-16 border-t border-line pt-10" aria-labelledby="cycles-heading">
        <h2 id="cycles-heading" className="font-display text-xl font-bold tracking-tight">
          Wanneer begint de nieuwe week per supermarkt?
        </h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          Elke keten heeft zijn eigen actiecyclus. Onderstaande startdagen zijn afgeleid uit de
          acties die op dit moment op SuperScout staan, niet uit een lijstje dat kan verouderen.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {chains.map(([source, cycle]) => {
            const meta = STORE_META[source as SupermarketSlug];
            return (
              <Link
                key={source}
                href={`/winkel/${source}`}
                className="rounded-2xl border border-line bg-surface p-4 transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
              >
                <span
                  className="inline-block rounded-md px-2 py-0.5 font-display text-xs font-bold"
                  style={{ background: meta.bg, color: meta.fg }}
                >
                  {meta.name}
                </span>
                <p className="mt-3 text-sm">
                  Nieuwe acties starten op{" "}
                  <strong className="font-semibold">{cycle.label}</strong>
                </p>
                <p className="mt-1 font-mono text-[11px] text-ink-soft">
                  {Math.round(cycle.share * 100)}% van de lopende acties
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="font-display text-xl font-bold tracking-tight">
          Veelgestelde vragen
        </h2>
        <dl className="mt-5 max-w-3xl space-y-6">
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt className="font-display text-base font-bold">{item.q}</dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-ink-soft">{item.aText}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-14 text-[15px] leading-relaxed text-ink-soft">
        Liever kijken wat er nú loopt? Bekijk{" "}
        <Link
          href="/"
          className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
        >
          alle aanbiedingen van deze week
        </Link>{" "}
        of blader{" "}
        <Link
          href="/categorieen"
          className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
        >
          per categorie
        </Link>
        .
      </p>
    </div>
  );
}

/**
 * Shown in the window where every chain's folder is the current one.
 *
 * Says so plainly instead of rendering an empty grid, and points at the next
 * moment worth checking — which is the actual answer to the query that brings
 * people here.
 */
function EmptyState() {
  const soonest = getOffers()
    .map((o) => o.validUntil)
    .filter((v) => v.length >= 10)
    .sort()[0];

  return (
    <div className="mt-10 rounded-2xl border border-line bg-surface-2 p-6">
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">Nog niets</p>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed">
        Geen enkele supermarkt heeft de folder van volgende week al online gezet. Dat gebeurt
        meestal een paar dagen voor de startdatum
        {/* validUntilShort already renders "t/m 30-08"; "eindigt t/m" was one
            preposition too many. */}
        {soonest ? `, en de eerste lopende actieweek loopt ${validUntilShort(soonest)}` : ""}.
        Kom over een paar dagen terug, of{" "}
        <Link
          href="/feed.xml"
          className="font-medium underline decoration-deal decoration-2 underline-offset-2"
        >
          abonneer je op de RSS-feed
        </Link>{" "}
        om nieuwe acties automatisch binnen te krijgen.
      </p>
    </div>
  );
}
