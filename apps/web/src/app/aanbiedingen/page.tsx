import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORY_LABEL, DEPARTMENTS } from "@superscout/core";
import { getOffers } from "@/lib/offers";
import { isIndexableTopic, offersInTopic, TOPICS } from "@/lib/topics";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

// Read at request time, never baked into the build: see `loadRaw` in
// lib/offers.ts for what a build-time prerender of this page contains.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aanbiedingen per product vergelijken",
  description:
    "Koffie, wasmiddel, luiers, bier of kattenvoer: zie per product welke winkels het deze week in de aanbieding hebben, met de grootste korting en de laagste actieprijs naast elkaar.",
  alternates: { canonical: "/aanbiedingen" },
};

/** Hub for the topic pages, grouped the way the category index is. */
export default function TopicsIndexPage() {
  const offers = getOffers();
  const withCounts = TOPICS.map((topic) => {
    const list = offersInTopic(offers, topic);
    return { topic, count: list.length, indexable: isIndexableTopic(list) };
  });

  const groups = DEPARTMENTS.map((d) => ({
    label: d.label,
    items: withCounts.filter((t) => (d.categories as readonly string[]).includes(t.topic.category)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 pb-24">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Aanbiedingen", path: "/aanbiedingen" },
        ])}
      />
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
        Aanbiedingen per product
      </h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
        Kies wat je zoekt en zie in één overzicht welke winkels het deze week in de aanbieding
        hebben. Staat iets er deze week niet bij? Volg het, dan zie je het bij je volgende bezoek.
      </p>

      {groups.map((group) => (
        <section key={group.label} className="mt-10">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink-soft">
            {group.label}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.items.map(({ topic, count, indexable }) => (
              <Link
                key={topic.slug}
                href={`/aanbiedingen/${topic.slug}`}
                className={`flex items-center justify-between rounded-2xl border border-line bg-surface p-4 font-display font-medium transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] ${
                  count === 0 ? "opacity-60" : ""
                }`}
                // Thin topics stay reachable for visitors, but we do not ask
                // crawlers to spend time on a page that says noindex.
                rel={indexable ? undefined : "nofollow"}
                title={CATEGORY_LABEL[topic.category]}
              >
                <span>{topic.label}</span>
                <span className="font-mono text-xs text-ink-soft">{count}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
