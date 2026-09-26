import Link from "next/link";
import type { CategorySlug } from "@superscout/core";
import { getOffers } from "@/lib/offers";
import { isIndexableTopic, offersInTopic, TOPICS } from "@/lib/topics";

/**
 * A row of links to topic pages that have something to show this week.
 *
 * Server-rendered, so crawlers follow them; only indexable topics, so a link
 * never leads to a page that asks not to be indexed.
 */
export function TopicLinks({
  category,
  limit = 10,
  label = "Vergelijk per product",
}: {
  category?: CategorySlug;
  limit?: number;
  label?: string;
}) {
  const offers = getOffers();
  const topics = TOPICS.filter((t) => !category || t.category === category)
    .map((topic) => ({ topic, list: offersInTopic(offers, topic) }))
    .filter((t) => isIndexableTopic(t.list))
    .sort((a, b) => b.list.length - a.list.length)
    .slice(0, limit);

  if (topics.length === 0) return null;

  return (
    <nav aria-label={label} className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink-soft">{label}:</span>
      {topics.map(({ topic, list }) => (
        <Link
          key={topic.slug}
          href={`/aanbiedingen/${topic.slug}`}
          className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm transition-colors hover:border-ink/30"
        >
          {topic.label} <span className="font-mono text-[11px] text-ink-soft">{list.length}</span>
        </Link>
      ))}
    </nav>
  );
}
