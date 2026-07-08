import type { Metadata } from "next";
import Link from "next/link";
import { byBiggestDiscount, getOffers, stats } from "@/lib/offers";
import { formatEuro, STORE_META } from "@/lib/format";
import { OfferCard } from "@/components/OfferCard";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Over SuperScout — dé aanbiedingen-vergelijker van Nederland",
  description:
    "Alle aanbiedingen van 10 Nederlandse supermarkten in één zoekopdracht. Dagelijks vers, gratis, zonder account en zonder tracking. Ontdek hoe SuperScout werkt.",
  alternates: { canonical: "/product" },
};

const FEATURES = [
  {
    title: "Zoek één keer, vergelijk overal",
    text: "Typ “koffie” en zie meteen wat élke winkel ervoor vraagt. Geen tien folders, geen tien apps.",
    icon: "🔍",
  },
  {
    title: "Sorteer op wat jou telt",
    text: "Prijs laag → hoog, hoogste korting of bijna verlopen. Jij bepaalt de volgorde, niemand anders.",
    icon: "↕",
  },
  {
    title: "Mandje per winkel",
    text: "Verzamel aanbiedingen en open je lijstje direct bij de winkel om te bestellen. Alles blijft op je eigen apparaat.",
    icon: "🧺",
  },
  {
    title: "Alleen wat vandaag geldt",
    text: "Elke keten hanteert eigen actieweken. SuperScout rekent per dag: verlopen of toekomstige acties zie je niet.",
    icon: "📅",
  },
  {
    title: "Eerlijk gelabeld",
    text: "Groothandelsprijzen (excl. btw) zijn duidelijk gemarkeerd, zodat je nooit appels met peren vergelijkt.",
    icon: "🏷",
  },
  {
    title: "Nul drempels",
    text: "Geen account, geen cookiebanner, geen app-download. Openen en besparen.",
    icon: "⚡",
  },
];

const FAQ = [
  {
    q: "Is SuperScout gratis?",
    a: "Ja, volledig. Er zijn geen advertenties, geen premium-versie en geen verborgen kosten. SuperScout is een onafhankelijk project zonder verdienmodel.",
  },
  {
    q: "Moet ik een account aanmaken?",
    a: "Nee. SuperScout werkt zonder registratie. Zelfs je winkelmandje wordt alleen op je eigen apparaat opgeslagen — wij kunnen er niet bij.",
  },
  {
    q: "Hoe actueel zijn de aanbiedingen?",
    a: "Elke ochtend vroeg worden alle winkels opnieuw ingelezen. Je ziet alleen acties die vandaag geldig zijn; verlopen en toekomstige acties worden weggefilterd.",
  },
  {
    q: "Welke supermarkten zitten erin?",
    a: "Albert Heijn, Jumbo, Lidl, ALDI, PLUS, Dirk, Hoogvliet, DekaMarkt, Poiesz en Sligro. Winkels die hun aanbiedingen alleen als folder-afbeelding publiceren, kunnen (nog) niet mee.",
  },
  {
    q: "Verdient SuperScout aan mijn aankopen?",
    a: "Nee. Er zijn geen affiliate-vergoedingen en geen winkel betaalt voor plaatsing of volgorde. De volgorde wordt alleen bepaald door jouw zoekopdracht, filters en sortering.",
  },
];

export default function ProductPage() {
  const offers = getOffers();
  const { total, stores } = stats(offers);
  const storeSlugs = [...new Set(offers.map((o) => o.source))].sort();
  const nowIso = new Date().toISOString();

  // Real proof, straight from today's data.
  const topDeals = byBiggestDiscount(offers).slice(0, 4);
  const receiptLines = byBiggestDiscount(offers)
    .filter((o) => o.pricing.savingsAbsoluteCents !== null)
    .slice(0, 5);
  const receiptTotal = receiptLines.reduce(
    (sum, o) => sum + (o.pricing.savingsAbsoluteCents ?? 0),
    0,
  );
  const maxPercent = topDeals[0]?.pricing.savingsPercent ?? 50;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pt-16">
        <div className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink-soft">
              {total} aanbiedingen · {stores} winkels · vandaag geldig
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.02] tracking-tight sm:text-6xl">
              Stop met folders bladeren.
              <br />
              <span className="text-deal">Begin met besparen.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
              SuperScout legt elke ochtend de aanbiedingen van {stores} Nederlandse supermarkten
              naast elkaar. Eén zoekopdracht, de beste deal — tot {maxPercent}% korting. Gratis,
              zonder account, zonder tracking.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/"
                className="rounded-full bg-deal px-7 py-3.5 font-display text-base font-bold text-deal-ink shadow-[0_8px_24px_rgba(245,168,0,0.35)] transition-transform hover:scale-[1.03]"
              >
                Bekijk alle aanbiedingen →
              </Link>
              <span className="font-mono text-xs text-ink-soft">
                Geen account nodig · werkt direct
              </span>
            </div>
          </div>

          {/* Signature: a kassabon with today's real biggest savings */}
          <div aria-hidden="true" className="hidden justify-center md:flex">
            <div className="w-72 rotate-2 rounded-sm bg-white px-5 py-6 font-mono text-[11px] leading-relaxed text-ink shadow-[0_18px_50px_rgba(0,0,0,0.14)] [mask-image:linear-gradient(180deg,#000_92%,transparent)]">
              <p className="text-center font-bold tracking-[0.25em]">SUPERSCOUT</p>
              <p className="mt-0.5 text-center text-[10px] text-ink-soft">jouw besparing vandaag</p>
              <div className="my-3 border-t border-dashed border-line" />
              {receiptLines.map((o) => (
                <div key={o.id} className="flex justify-between gap-2">
                  <span className="truncate">{o.title.toUpperCase().slice(0, 20)}</span>
                  <span className="shrink-0 font-bold text-fresh">
                    -{formatEuro(o.pricing.savingsAbsoluteCents ?? 0)}
                  </span>
                </div>
              ))}
              <div className="my-3 border-t border-dashed border-line" />
              <div className="flex justify-between font-bold">
                <span>TOTAAL BESPAARD</span>
                <span className="text-fresh">-{formatEuro(receiptTotal)}</span>
              </div>
              <p className="mt-3 text-center text-[10px] text-ink-soft">
                * echte aanbiedingen van vandaag
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Logo wall ────────────────────────────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">
            Alle grote ketens, één overzicht
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {storeSlugs.map((s) => (
              <Link
                key={s}
                href={`/winkel/${s}`}
                className="rounded-full px-4 py-2 font-display text-sm font-bold shadow-sm transition-transform hover:scale-105"
                style={{ background: STORE_META[s].bg, color: STORE_META[s].fg }}
              >
                {STORE_META[s].name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem → solution ───────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-12 sm:py-12 sm:py-16">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-line bg-surface p-7">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-urgent">
              Zonder SuperScout
            </p>
            <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-ink-soft">
              <li>📚 {stores} folders doorbladeren of {stores} apps installeren</li>
              <li>🗓 Elke keten een andere actieweek — is dit nog geldig?</li>
              <li>🍪 Cookiewalls, accounts en spaarprogramma's die je volgen</li>
              <li>🤷 Nooit zeker of dit écht de laagste prijs is</li>
            </ul>
          </div>
          <div className="rounded-3xl border-2 border-deal bg-deal/[0.06] p-7">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-deal">
              Met SuperScout
            </p>
            <ul className="mt-4 space-y-3 text-[15px] leading-relaxed">
              <li>⚡ Eén zoekopdracht over alle {stores} winkels tegelijk</li>
              <li>✅ Alleen acties die vandaag geldig zijn</li>
              <li>🛡 Geen account, geen cookies, geen tracking</li>
              <li>🏆 Sorteer op prijs of korting en zie direct de winnaar</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:py-12 sm:py-16">
          <h2 className="max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Alles wat je nodig hebt om slim boodschappen te doen.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-line bg-bg p-5">
                <span className="text-2xl" aria-hidden="true">
                  {f.icon}
                </span>
                <h3 className="mt-3 font-display text-[16px] font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live proof: today's biggest discounts ────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-12 sm:py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            De grootste kortingen van vandaag.
          </h2>
          <Link
            href="/"
            className="font-mono text-xs font-bold text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            alle {total} aanbiedingen →
          </Link>
        </div>
        <p className="mt-2 font-mono text-xs text-ink-soft">
          Geen showroom-voorbeelden — dit zijn live aanbiedingen, vanochtend opgehaald.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {topDeals.map((o) => (
            <OfferCard key={o.id} offer={o} nowIso={nowIso} />
          ))}
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────── */}
      <section className="border-y border-line bg-ink text-bg">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:py-14 md:grid-cols-3">
          <div>
            <h3 className="font-display text-lg font-bold">Privacy als uitgangspunt</h3>
            <p className="mt-2 text-sm leading-relaxed text-bg/70">
              Geen persoonsgegevens, geen cookies, geen trackers. Je mandje blijft op je eigen
              apparaat.{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-bg">
                Privacyverklaring
              </Link>
            </p>
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Geen betaalde ranking</h3>
            <p className="mt-2 text-sm leading-relaxed text-bg/70">
              Geen winkel betaalt voor plaatsing en er zijn geen affiliate-deals. Wat jij ziet, is
              puur op jouw keuzes gesorteerd.{" "}
              <Link href="/ethiek" className="underline underline-offset-2 hover:text-bg">
                Ethiek &amp; transparantie
              </Link>
            </p>
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Eerlijk over grenzen</h3>
            <p className="mt-2 text-sm leading-relaxed text-bg/70">
              Data wordt automatisch overgenomen; de winkel is altijd leidend voor de definitieve
              prijs.{" "}
              <Link href="/voorwaarden" className="underline underline-offset-2 hover:text-bg">
                Algemene voorwaarden
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-12 sm:py-12 sm:py-16">
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Zo werkt het.</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Elke ochtend vers",
              text: `SuperScout leest 's ochtends de openbare aanbiedingenpagina's van alle ${stores} winkels — één bezoek per winkel per dag.`,
            },
            {
              step: "02",
              title: "Eén taal voor alle acties",
              text: "“1+1 gratis”, “2 voor 4,99”, “25% korting” — alles wordt vertaald naar één vergelijkbaar formaat, tot op de cent.",
            },
            {
              step: "03",
              title: "Jij pakt de deal",
              text: "Zoek, sorteer, zet in je mandje en open je lijstje direct bij de winkel om te bestellen of te halen.",
            },
          ].map((s) => (
            <div key={s.step} className="rounded-2xl border border-line bg-surface p-6">
              <span className="font-mono text-xs font-bold text-deal">{s.step}</span>
              <h3 className="mt-2 font-display text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:py-12 sm:py-16">
          <h2 className="font-display text-3xl font-bold tracking-tight">Veelgestelde vragen</h2>
          <div className="mt-6 divide-y divide-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[16px] font-bold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="shrink-0 text-ink-soft transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Maker + final CTA ────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:py-20 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-5xl">
          Klaar om te besparen op je boodschappen?
        </h2>
        <div className="mt-8">
          <Link
            href="/"
            className="inline-block rounded-full bg-deal px-8 py-4 font-display text-lg font-bold text-deal-ink shadow-[0_8px_24px_rgba(245,168,0,0.35)] transition-transform hover:scale-[1.03]"
          >
            Open SuperScout →
          </Link>
        </div>
        <p className="mt-10 font-mono text-xs text-ink-soft">
          SuperScout is een onafhankelijk project van{" "}
          <a
            href="https://stijnvandepol.nl"
            target="_blank"
            rel="noopener me"
            className="font-bold text-ink underline underline-offset-2 hover:text-deal"
          >
            Stijn van de Pol
          </a>{" "}
          — geen investeerders, geen advertentiedeals. Vragen of feedback? Neem via die site
          contact op.
        </p>
      </section>
    </div>
  );
}
