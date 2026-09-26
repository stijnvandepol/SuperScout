import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dataFetchedAt } from "@/lib/offers";
import { offerSlug } from "@/lib/format";
import { dealTypeBySlug } from "@/lib/deal-types";
import { OfferGrid } from "@/components/OfferGrid";
import { listOffers } from "@/lib/lists";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, faqJsonLd, offerListJsonLd, SITE_URL } from "@/lib/seo";

// Per request, not ISR. With `generateStaticParams` these four pages were
// prerendered during `docker build`, when there is no offer data yet — so each
// one hit the `notFound()` below and that 404 was cached for the revalidate
// window. Every deploy took them offline for up to half an hour, crawlers
// included. See `loadRaw` in lib/offers.ts for the same failure elsewhere.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const type = dealTypeBySlug(slug);
  if (!type) return { title: "Actie niet gevonden" };

  const canonical = `/acties/${slug}`;
  return {
    title: type.title,
    description: type.description,
    alternates: { canonical },
    openGraph: {
      title: type.title,
      description: type.description,
      type: "website",
      locale: "nl_NL",
      url: canonical,
    },
  };
}

export default async function DealTypePage({ params }: Params) {
  const { slug } = await params;
  const type = dealTypeBySlug(slug);
  if (!type) notFound();

  const offers = listOffers("actie", slug) ?? [];
  // An empty landing page is worse than no landing page: it would be indexed
  // as a soft 404. The sitemap applies the same rule.
  if (offers.length === 0) notFound();

  const nowIso = new Date().toISOString();
  const canonical = `/acties/${slug}`;
  const storeCount = new Set(offers.map((o) => o.source)).size;

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Acties", path: "/acties" },
          { name: type.label, path: canonical },
        ])}
      />
      <JsonLd
        data={offerListJsonLd({
          name: type.title,
          description: type.description,
          url: `${SITE_URL}${canonical}`,
          offers,
          slugOf: offerSlug,
        })}
      />
      <JsonLd data={faqJsonLd(`${SITE_URL}${canonical}#faq`, type.faq)} />

      <header className="py-8">
        <span className="font-mono text-sm text-ink-soft">
          {offers.length} aanbiedingen · {storeCount} winkels
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {type.title}
        </h1>
        <div className="mt-4 max-w-3xl space-y-3 text-[15px] leading-relaxed text-ink-soft">
          {type.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>
      </header>

      <OfferGrid offers={offers} nowIso={nowIso} dataDate={dataFetchedAt()} list={{ kind: "actie", slug }} />

      <section className="mt-20 border-t border-line pt-12" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="font-display text-2xl font-bold tracking-tight">
          Veelgestelde vragen over {type.label.toLowerCase()}
        </h2>
        <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {type.faq.map((item) => (
            <div key={item.q}>
              <dt className="font-display text-[16px] font-bold">{item.q}</dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-ink-soft">{item.aText}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
