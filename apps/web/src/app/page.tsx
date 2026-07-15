import type { Metadata } from "next";
import Link from "next/link";
import { getOffers, stats } from "@/lib/offers";
import { OfferExplorer } from "@/components/OfferExplorer";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/seo";

// Re-read live offers periodically (ISR).
export const revalidate = 1800;

// Filtered/searched variants (?q=…) all canonicalise to the clean homepage.
export const metadata: Metadata = { alternates: { canonical: "/" } };

/** ISO 8601 week number — offers roll over weekly, so the hero names the week. */
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
}

const FAQ: { q: string; a: React.ReactNode; aText: string }[] = [
  {
    q: "Welke supermarkten staan op SuperScout?",
    a: (
      <>
        SuperScout verzamelt de aanbiedingen van Albert Heijn, Jumbo, Lidl, ALDI, PLUS, Dirk,
        Hoogvliet, DekaMarkt, Poiesz en Sligro. Bekijk het overzicht per winkel op de{" "}
        <Link href="/winkels" className="font-bold underline decoration-deal decoration-2 underline-offset-2">
          winkelpagina
        </Link>
        .
      </>
    ),
    aText:
      "SuperScout verzamelt de aanbiedingen van Albert Heijn, Jumbo, Lidl, ALDI, PLUS, Dirk, Hoogvliet, DekaMarkt, Poiesz en Sligro.",
  },
  {
    q: "Hoe vaak worden de aanbiedingen ververst?",
    a: "De aanbiedingen worden dagelijks opgehaald bij de supermarkten zelf. Zodra een winkel nieuwe weekacties publiceert, staan ze kort daarna op SuperScout — inclusief einddatum, zodat je ziet hoelang een actie nog loopt.",
    aText:
      "De aanbiedingen worden dagelijks opgehaald bij de supermarkten zelf. Zodra een winkel nieuwe weekacties publiceert, staan ze kort daarna op SuperScout.",
  },
  {
    q: "Is SuperScout gratis?",
    a: "Ja. SuperScout is volledig gratis, zonder account en zonder tracking. Je boodschappenmandje wordt alleen lokaal op je eigen apparaat bewaard.",
    aText:
      "Ja. SuperScout is volledig gratis, zonder account en zonder tracking. Je boodschappenmandje wordt alleen lokaal op je eigen apparaat bewaard.",
  },
  {
    q: "Hoe vergelijk ik aanbiedingen tussen supermarkten?",
    a: (
      <>
        Zoek een product (bijvoorbeeld “koffie” of “gehakt”) en je ziet in één lijst wat elke
        supermarkt er deze week voor vraagt. Filter op winkel of{" "}
        <Link href="/categorieen" className="font-bold underline decoration-deal decoration-2 underline-offset-2">
          categorie
        </Link>
        , sorteer op prijs of korting, en zet je keuzes in je mandje.
      </>
    ),
    aText:
      "Zoek een product en je ziet in één lijst wat elke supermarkt er deze week voor vraagt. Filter op winkel of categorie, sorteer op prijs of korting, en zet je keuzes in je mandje.",
  },
];

export default function Home() {
  const offers = getOffers();
  const { total, stores } = stats(offers);
  // Reference "now" resolved once on the server so client + SSR agree.
  const now = new Date();
  const nowIso = now.toISOString();
  const week = isoWeek(now);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.aText },
    })),
  };

  return (
    <div className="mx-auto max-w-6xl px-5">
      <JsonLd data={faqJsonLd} />
      <div className="pb-24 pt-8">
        {/* Crawlable hero: the page's only h1 states the core query we target. */}
        <header className="mb-6">
          <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl">
            Alle supermarktaanbiedingen van deze week
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] text-ink-soft">
            Vergelijk in week {week} de acties van Albert Heijn, Jumbo, Lidl, ALDI, PLUS, Dirk en
            meer — gratis, zonder account.
          </p>
        </header>

        <OfferExplorer
          offers={offers}
          nowIso={nowIso}
          stat={`${total} aanbiedingen · ${stores} winkels`}
        />

        {/* Indexable explainer + FAQ. Lives below the fold so the tool stays front and centre. */}
        <section className="mt-20 border-t border-line pt-12" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Veelgestelde vragen
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            SuperScout is een onafhankelijke vergelijker van supermarktaanbiedingen in Nederland.
            Geen folders doorbladeren: één zoekopdracht laat zien waar jouw boodschappen deze week
            het minst kosten. Lees{" "}
            <Link href="/product" className="font-bold text-ink underline decoration-deal decoration-2 underline-offset-2">
              hoe SuperScout werkt
            </Link>
            .
          </p>
          <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {FAQ.map((item) => (
              <div key={item.q}>
                <dt className="font-display text-[16px] font-bold">{item.q}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-ink-soft">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
