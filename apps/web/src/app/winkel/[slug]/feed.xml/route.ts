import { notFound } from "next/navigation";
import type { SupermarketSlug } from "@superscout/core";
import { byBiggestDiscount, getOffers } from "@/lib/offers";
import { STORE_META } from "@/lib/format";
import { feedResponse, renderRssFeed } from "@/lib/feed";

export const revalidate = 1800;

export function generateStaticParams() {
  return [...new Set(getOffers().map((o) => o.source))].map((slug) => ({ slug }));
}

/** Per-chain feed — subscribe to just the supermarket you actually shop at. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  const meta = STORE_META[slug as SupermarketSlug];
  if (!meta) notFound();

  const offers = byBiggestDiscount(getOffers().filter((o) => o.source === slug));
  if (offers.length === 0) notFound();

  return feedResponse(
    renderRssFeed({
      title: `${meta.name} aanbiedingen — SuperScout`,
      description: `Alle actuele aanbiedingen van ${meta.name}, dagelijks ververst. Zonder account, zonder tracking.`,
      path: `/winkel/${slug}`,
      offers,
    }),
  );
}
