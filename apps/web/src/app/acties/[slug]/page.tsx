import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { byBiggestDiscount, getOffers } from "@/lib/offers";
import { offerSlug } from "@/lib/format";
import { DEAL_TYPES, dealTypeBySlug } from "@/lib/deal-types";
import { OfferGrid } from "@/components/OfferGrid";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, faqJsonLd, offerListJsonLd, SITE_URL } from "@/lib/seo";

export const revalidate = 1800;

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return DEAL_TYPES.map((d) => ({ slug: d.slug }));
}

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

  const offers = byBiggestDiscount(getOffers().filter(type.matches));
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

      <OfferGrid offers={offers} nowIso={nowIso} />

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
