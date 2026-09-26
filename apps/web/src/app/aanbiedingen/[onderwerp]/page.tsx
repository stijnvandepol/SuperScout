import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Offer, SupermarketSlug } from "@superscout/core";
import { CATEGORY_LABEL, effectiveDiscountPercent, retailerNoun } from "@superscout/core";
import { dataFetchedAt, getOffers } from "@/lib/offers";
import { formatEuro, offerSlug, STORE_META } from "@/lib/format";
import { dutchList } from "@/lib/chains";
import { isIndexableTopic, offersInTopic, TOPICS, topicBySlug, type Topic } from "@/lib/topics";
import { OfferGrid } from "@/components/OfferGrid";
import { listOffers } from "@/lib/lists";
import { FollowButton } from "@/components/FollowButton";
import { ImageHostPreconnect } from "@/components/ImageHostPreconnect";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, faqJsonLd, offerListJsonLd, SITE_URL } from "@/lib/seo";

// Read at request time, never baked into the build: see `loadRaw` in
// lib/offers.ts for what a build-time prerender of this page contains.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ onderwerp: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { onderwerp } = await params;
  const topic = topicBySlug(onderwerp);
  if (!topic) return { title: "Onderwerp niet gevonden" };

  const offers = offersInTopic(getOffers(), topic);
  const stores = new Set(offers.map((o) => o.source));
  const title = `${topic.label} aanbiedingen deze week`;
  const description =
    offers.length > 0
      ? `${offers.length} ${topic.label.toLowerCase()}-aanbiedingen bij ${stores.size} ${retailerNoun(stores)} naast elkaar: ${dutchList([...stores].slice(0, 4).map((s) => STORE_META[s].name))}. Zie direct waar ${topic.label.toLowerCase()} deze week het voordeligst is.`
      : `Deze week geen ${topic.label.toLowerCase()}-aanbiedingen. Volg ${topic.label.toLowerCase()} op SuperScout en zie bij je volgende bezoek wanneer het weer in de aanbieding is.`;
  const canonical = `/aanbiedingen/${topic.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    ...(isIndexableTopic(offers) ? {} : { robots: { index: false, follow: true } }),
    openGraph: { title, description, type: "website", locale: "nl_NL", url: canonical },
  };
}

interface StoreRow {
  source: SupermarketSlug;
  count: number;
  cheapest: Offer | undefined;
  sharpest: { offer: Offer; percent: number } | undefined;
}

function perStore(offers: Offer[]): StoreRow[] {
  const grouped = new Map<SupermarketSlug, Offer[]>();
  for (const o of offers) grouped.set(o.source, [...(grouped.get(o.source) ?? []), o]);
  return [...grouped.entries()]
    .map(([source, list]) => {
      const priced = list.filter((o) => o.pricing.currentPriceCents !== null);
      const cheapest = priced.sort((a, b) => a.pricing.currentPriceCents! - b.pricing.currentPriceCents!)[0];
      const sharpest = list
        .map((offer) => ({ offer, percent: effectiveDiscountPercent(offer) }))
        .filter((x): x is { offer: Offer; percent: number } => x.percent !== null && x.percent > 0)
        .sort((a, b) => b.percent - a.percent)[0];
      return { source, count: list.length, cheapest, sharpest };
    })
    .sort((a, b) => (b.sharpest?.percent ?? 0) - (a.sharpest?.percent ?? 0) || b.count - a.count);
}

/**
 * One topic across every store: "koffie aanbiedingen deze week".
 *
 * The comparison table is the reason the page exists — the grid alone would
 * be a filtered search result. Prices are compared per offer as the store
 * quotes them; per-kilo comparison needs pack sizes that most chains do not
 * publish in a readable form, and a table that guesses is worse than none.
 */
export default async function TopicPage({ params }: Params) {
  const { onderwerp } = await params;
  const topic = topicBySlug(onderwerp);
  if (!topic) notFound();

  const offers = listOffers("onderwerp", topic.slug) ?? [];
  const nowIso = new Date().toISOString();
  const canonical = `/aanbiedingen/${topic.slug}`;
  const rows = perStore(offers);
  const indexable = isIndexableTopic(offers);
  const faq = topicFaq(topic, offers, rows);
  const lower = topic.label.toLowerCase();

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      <ImageHostPreconnect offers={offers.slice(0, 8)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Aanbiedingen", path: "/aanbiedingen" },
          { name: topic.label, path: canonical },
        ])}
      />
      {offers.length > 0 ? (
        <JsonLd
          data={offerListJsonLd({
            name: `${topic.label} aanbiedingen`,
            description: `Actuele ${lower}-aanbiedingen bij alle winkels.`,
            url: `${SITE_URL}${canonical}`,
            offers,
            slugOf: offerSlug,
          })}
        />
      ) : null}
      {indexable ? <JsonLd data={faqJsonLd(`${SITE_URL}${canonical}#faq`, faq)} /> : null}

      <header className="py-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
          <Link href={`/categorie/${topic.category}`} className="hover:text-ink">
            {CATEGORY_LABEL[topic.category]}
          </Link>
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {topic.label} aanbiedingen deze week
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
          {offers.length > 0
            ? `${offers.length} ${offers.length === 1 ? "actie" : "acties"} op ${lower} bij ${rows.length} ${retailerNoun(rows.map((r) => r.source))}, gesorteerd op de grootste korting. Dagelijks bijgewerkt.`
            : `Op dit moment heeft geen enkele winkel ${lower} in de aanbieding. Dat wisselt per week.`}
        </p>
        <div className="mt-5">
          <FollowButton term={topic.term} matchIds={offers.map((o) => o.id)} />
        </div>
      </header>

      {rows.length > 1 ? (
        <section aria-labelledby="vergelijk-heading" className="mb-10">
          <h2 id="vergelijk-heading" className="font-display text-xl font-bold tracking-tight">
            {topic.label} per winkel
          </h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                <tr>
                  <th scope="col" className="px-4 py-3">Winkel</th>
                  <th scope="col" className="px-4 py-3">Acties</th>
                  <th scope="col" className="px-4 py-3">Grootste korting</th>
                  <th scope="col" className="px-4 py-3">Laagste actieprijs</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.source} className="border-t border-line">
                    <th scope="row" className="px-4 py-3 font-bold">
                      <Link href={`/winkel/${r.source}`} className="hover:underline">
                        {STORE_META[r.source].name}
                      </Link>
                    </th>
                    <td className="px-4 py-3 font-mono">{r.count}</td>
                    <td className="px-4 py-3">
                      {r.sharpest ? (
                        <Link href={`/aanbieding/${offerSlug(r.sharpest.offer)}`} className="hover:underline">
                          <strong className="font-mono text-fresh">−{r.sharpest.percent}%</strong>{" "}
                          <span className="text-ink-soft">{r.sharpest.offer.title}</span>
                        </Link>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.cheapest ? (
                        <Link href={`/aanbieding/${offerSlug(r.cheapest)}`} className="hover:underline">
                          <span className="font-mono font-bold">{formatEuro(r.cheapest.pricing.currentPriceCents)}</span>{" "}
                          <span className="text-ink-soft">{r.cheapest.title}</span>
                        </Link>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 font-mono text-[11px] text-ink-soft">
            Prijzen zoals de winkel ze noemt, per verpakking. Verpakkingen verschillen — vergelijk
            op de productpagina de inhoud.
          </p>
        </section>
      ) : null}

      {offers.length > 0 ? (
        <OfferGrid offers={offers} nowIso={nowIso} dataDate={dataFetchedAt()} list={{ kind: "onderwerp", slug: topic.slug }} />
      ) : (
        <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
          <p className="font-display text-lg">Geen {lower}-acties deze week</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
            Volg {lower} hierboven: bij je volgende bezoek zie je meteen of het weer ergens in de
            aanbieding is. Of abonneer je op de{" "}
            <a href={`/feed.xml?q=${encodeURIComponent(topic.term)}`} className="font-bold text-ink underline underline-offset-2">
              RSS-feed voor {lower}
            </a>
            .
          </p>
        </div>
      )}

      <section className="mt-16 border-t border-line pt-12" aria-labelledby="tip-heading">
        <h2 id="tip-heading" className="font-display text-2xl font-bold tracking-tight">
          Slim {lower} kopen
        </h2>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink-soft">{topic.tip}</p>
      </section>

      {indexable ? (
        <section className="mt-16 border-t border-line pt-12" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="font-display text-2xl font-bold tracking-tight">
            Veelgestelde vragen over {lower} in de aanbieding
          </h2>
          <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {faq.map((item) => (
              <div key={item.q}>
                <dt className="font-display text-[16px] font-bold">{item.q}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-ink-soft">{item.aText}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <RelatedTopics current={topic} />
    </div>
  );
}

/** Answers composed from this week's data, so no two weeks — or topics — read the same. */
function topicFaq(topic: Topic, offers: Offer[], rows: StoreRow[]) {
  const lower = topic.label.toLowerCase();
  const best = rows.find((r) => r.sharpest)?.sharpest;
  const cheapest = rows
    .map((r) => r.cheapest)
    .filter((o): o is Offer => o !== undefined)
    .sort((a, b) => a.pricing.currentPriceCents! - b.pricing.currentPriceCents!)[0];

  return [
    {
      q: `Waar is ${lower} deze week in de aanbieding?`,
      aText: `Deze week hebben ${dutchList(rows.map((r) => STORE_META[r.source].name))} ${lower} in de aanbieding, samen ${offers.length} acties. De tabel op deze pagina zet ze per winkel naast elkaar.`,
    },
    {
      q: `Wat is de grootste korting op ${lower}?`,
      aText: best
        ? `De scherpste actie is ${best.offer.title} bij ${STORE_META[best.offer.source].name}, omgerekend ${best.percent}% korting per stuk.`
        : `Deze week hebben de ${lower}-acties geen korting die eerlijk in een percentage is uit te drukken; bekijk de actieprijzen in de tabel.`,
    },
    ...(cheapest
      ? [
          {
            q: `Wat is de laagste actieprijs voor ${lower}?`,
            aText: `${cheapest.title} bij ${STORE_META[cheapest.source].name} voor ${formatEuro(cheapest.pricing.currentPriceCents)}. Let op: dat is de prijs per verpakking, en verpakkingen verschillen in inhoud.`,
          },
        ]
      : []),
    {
      q: `Hoe weet ik wanneer ${lower} weer in de aanbieding is?`,
      aText: `Volg ${lower} op deze pagina. SuperScout onthoudt dat alleen in je eigen browser en laat bij je volgende bezoek zien wat er nieuw is. Wie een melding wil zonder terug te komen, kan de RSS-feed voor ${lower} gebruiken.`,
    },
  ];
}

/** Other topics in the same category first, then the rest — each page a small hub. */
function RelatedTopics({ current }: { current: Topic }) {
  const offers = getOffers();
  const others = TOPICS.filter((t) => t.slug !== current.slug)
    .map((t) => ({ topic: t, offers: offersInTopic(offers, t) }))
    .filter((x) => isIndexableTopic(x.offers))
    .sort(
      (a, b) =>
        Number(b.topic.category === current.category) - Number(a.topic.category === current.category) ||
        b.offers.length - a.offers.length,
    )
    .slice(0, 12);
  if (others.length === 0) return null;

  return (
    <section className="mt-16 border-t border-line pt-12" aria-labelledby="meer-heading">
      <h2 id="meer-heading" className="font-display text-2xl font-bold tracking-tight">
        Meer aanbiedingen vergelijken
      </h2>
      <div className="mt-5 flex flex-wrap gap-2">
        {others.map(({ topic, offers: list }) => (
          <Link
            key={topic.slug}
            href={`/aanbiedingen/${topic.slug}`}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm transition-colors hover:border-ink/30"
          >
            {topic.label} <span className="font-mono text-xs text-ink-soft">{list.length}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
