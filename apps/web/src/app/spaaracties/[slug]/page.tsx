import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SAVINGS_CAMPAIGNS, savingsCampaignBySlug } from "@/lib/spaaracties";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd, faqJsonLd, SITE_URL } from "@/lib/seo";

export const revalidate = 86_400;

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SAVINGS_CAMPAIGNS.map((campaign) => ({ slug: campaign.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const campaign = savingsCampaignBySlug(slug);
  if (!campaign) return { title: "Spaaractie niet gevonden" };

  return {
    title: campaign.title,
    description: campaign.description,
    alternates: { canonical: `/spaaracties/${slug}` },
    openGraph: {
      title: campaign.title,
      description: campaign.description,
      type: "article",
      locale: "nl_NL",
      url: `/spaaracties/${slug}`,
    },
  };
}

export default async function SavingsCampaignPage({ params }: Params) {
  const { slug } = await params;
  const campaign = savingsCampaignBySlug(slug);
  if (!campaign) notFound();

  const others = SAVINGS_CAMPAIGNS.filter((c) => c.slug !== slug);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 pb-24">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Spaaracties", path: "/spaaracties" },
          { name: campaign.label, path: `/spaaracties/${slug}` },
        ])}
      />
      <JsonLd data={faqJsonLd(`${SITE_URL}/spaaracties/${slug}#faq`, campaign.faq)} />
      {/* HowTo-shaped content without HowTo markup: Google retired HowTo rich
          results, and emitting markup that can no longer produce one is noise
          that still has to be validated. The headings do the work instead. */}

      <p className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
        <Link href="/spaaracties" className="hover:text-ink">
          Spaaracties
        </Link>
      </p>

      <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
        {campaign.title}
      </h1>

      <div className="mt-5 max-w-3xl space-y-4 text-[15px] leading-relaxed text-ink-soft">
        {campaign.intro.map((paragraph) => (
          <p key={paragraph.slice(0, 40)}>{paragraph}</p>
        ))}
      </div>

      <section className="mt-14 border-t border-line pt-10" aria-labelledby="steps-heading">
        <h2 id="steps-heading" className="font-display text-xl font-bold tracking-tight">
          Zo werkt het
        </h2>
        <ol className="mt-6 max-w-3xl space-y-6">
          {campaign.steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs font-bold text-surface">
                {index + 1}
              </span>
              <div>
                <h3 className="font-display text-base font-bold">{step.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14" aria-labelledby="verdict-heading">
        <h2 id="verdict-heading" className="font-display text-xl font-bold tracking-tight">
          Loont het?
        </h2>
        <div className="mt-4 max-w-3xl space-y-4 text-[15px] leading-relaxed text-ink-soft">
          {campaign.verdict.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>
        <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-ink-soft">
          Controleer voor je je boodschappen verplaatst eerst even{" "}
          <Link
            href="/"
            className="font-medium text-ink underline decoration-deal decoration-2 underline-offset-2"
          >
            de aanbiedingen van deze week
          </Link>
          . Het prijsverschil op een weekmandje tussen twee ketens is vaak groter dan het voordeel
          van de spaaractie zelf.
        </p>
      </section>

      <section className="mt-14" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="font-display text-xl font-bold tracking-tight">
          Veelgestelde vragen
        </h2>
        <dl className="mt-5 max-w-3xl space-y-6">
          {campaign.faq.map((item) => (
            <div key={item.q}>
              <dt className="font-display text-base font-bold">{item.q}</dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-ink-soft">{item.aText}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14 border-t border-line pt-10">
        <h2 className="font-display text-xl font-bold tracking-tight">Andere soorten spaaracties</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {others.map((other) => (
            <Link
              key={other.slug}
              href={`/spaaracties/${other.slug}`}
              className="rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)]"
            >
              <h3 className="font-display text-base font-bold tracking-tight">{other.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{other.teaser}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
