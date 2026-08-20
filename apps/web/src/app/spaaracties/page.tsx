import type { Metadata } from "next";
import Link from "next/link";
import { SAVINGS_CAMPAIGNS } from "@/lib/spaaracties";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, faqJsonLd, SITE_FEED_ALTERNATE, SITE_URL } from "@/lib/seo";

export const revalidate = 86_400;

const TITLE = "Spaaracties bij de supermarkt — alle soorten uitgelegd";
const DESCRIPTION =
  "Zegelacties voor bestek en pannen, stickeralbums, koopzegels, muntenacties en seizoensacties: hoe elke supermarktspaaractie werkt, wat hij oplevert en wanneer sparen loont.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/spaaracties", types: SITE_FEED_ALTERNATE },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    locale: "nl_NL",
    url: "/spaaracties",
  },
};

const FAQ = [
  {
    q: "Welke spaaracties draaien Nederlandse supermarkten?",
    aText:
      "Grofweg vijf soorten: zegelacties voor bestek, pannen en messen; sticker- en dierenalbums; koopzegels die je zelf koopt en met rente terugkrijgt; munten- en bingoacties waarbij geluk meespeelt; en seizoensacties rond de zomer en de feestdagen. Welke keten er op een bepaald moment een draait, staat in de folder van de supermarkt zelf.",
  },
  {
    q: "Levert een supermarktspaaractie echt geld op?",
    aText:
      "Alleen koopzegels leveren aantoonbaar geld op, omdat een vol boekje meer uitkeert dan je inleg. Zegelacties voor bestek of pannen leveren korting op een product op, mits je de boodschappen toch al deed. Sticker- en kansacties zijn geen besparing.",
  },
  {
    q: "Hoeveel boodschappen kost een volle spaarkaart?",
    aText:
      "Vermenigvuldig het bedrag per zegel met het aantal zegels op de kaart. Bij één zegel per €10 en een kaart van 30 zegels is dat €300 aan boodschappen per artikel.",
  },
  {
    q: "Hoelang kan ik volle spaarkaarten nog inleveren?",
    aText:
      "Bijna altijd nog enkele weken na het einde van de spaarperiode, maar niet onbeperkt. De inleverdatum staat op de spaarkaart en op de actiepagina van de keten.",
  },
  {
    q: "Ik wil een spaaractie leveren aan een supermarkt — hoe werkt dat?",
    aText:
      "Supermarktspaaracties worden ingekocht via de category- of loyaltyafdeling van de keten, of via het inkoopcollectief waar de keten bij is aangesloten. Trajecten lopen doorgaans zes tot achttien maanden vooruit, omdat productie, volumeprognose en folderplanning ruim van tevoren vastliggen.",
  },
];

export default function SavingsCampaignsPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 pb-24">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Spaaracties", path: "/spaaracties" },
        ])}
      />
      <JsonLd data={faqJsonLd(`${SITE_URL}/spaaracties#faq`, FAQ)} />

      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Spaaracties bij de supermarkt
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        Naast de weekaanbiedingen draaien supermarkten spaaracties: zegels voor een pannenset,
        stickers voor een album, munten, koopzegels. Ze werken allemaal anders en leveren allemaal
        iets anders op. Hieronder staat per soort hoe hij werkt, wat je ervoor moet uitgeven en
        wanneer sparen daadwerkelijk loont.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {SAVINGS_CAMPAIGNS.map((campaign) => (
          <Link
            key={campaign.slug}
            href={`/spaaracties/${campaign.slug}`}
            className="rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
          >
            <h2 className="font-display text-lg font-bold tracking-tight">{campaign.label}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{campaign.teaser}</p>
            <span className="mt-4 inline-block font-mono text-[11px] uppercase tracking-widest text-ink-soft">
              Lees hoe het werkt →
            </span>
          </Link>
        ))}
      </div>

      {/* Deliberately explicit about what this hub is not. The queries that land
          here ("welke spaaractie loopt er nu") deserve an honest answer rather
          than a stale list — a page claiming a campaign is running when it
          ended six weeks ago is worse than no page. */}
      <section className="mt-14 rounded-2xl border border-line bg-surface-2 p-6">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Welke spaaractie loopt er op dit moment?
        </h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-soft">
          SuperScout houdt de weekaanbiedingen van tien supermarkten dagelijks bij, maar spaaracties
          worden niet in die feeds gepubliceerd — ze staan alleen in de folder en op de actiepagina
          van de keten zelf. We zetten hier daarom geen lijst neer die na zes weken niet meer klopt.
          Wat wel klopt: de mechaniek van elke actievorm verandert nauwelijks, en dat is precies wat
          je nodig hebt om te beoordelen of meedoen loont.
        </p>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-ink-soft">
          Kijk voor de lopende actie in de folder van je eigen supermarkt, en gebruik{" "}
          <Link
            href="/"
            className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
          >
            de aanbiedingen van deze week
          </Link>{" "}
          om te controleren of je bij die keten ook echt het goedkoopst uit bent. Een spaaractie is
          zelden genoeg reden om je boodschappen te verplaatsen.
        </p>
      </section>

      <section className="mt-14" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="font-display text-xl font-bold tracking-tight">
          Veelgestelde vragen over spaaracties
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
    </div>
  );
}
