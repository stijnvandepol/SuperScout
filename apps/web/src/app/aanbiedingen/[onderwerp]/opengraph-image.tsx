import { effectiveDiscountPercent, isoWeekNumber } from "@superscout/core";
import { listOffers } from "@/lib/lists";
import { topicBySlug } from "@/lib/topics";
import { dealCard, OG_SIZE } from "@/lib/og";

export const alt = "Aanbiedingen van deze week op SuperScout";
export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ onderwerp: string }> }) {
  const { onderwerp } = await params;
  const topic = topicBySlug(onderwerp);
  const offers = topic ? (listOffers("onderwerp", topic.slug) ?? []) : [];
  const stores = new Set(offers.map((o) => o.source)).size;
  const label = topic?.label ?? "Aanbiedingen";

  return dealCard({
    eyebrow: `Week ${isoWeekNumber(new Date())}`,
    title: `${label} aanbiedingen`,
    subtitle:
      offers.length > 0
        ? `${offers.length} acties bij ${stores} ${stores === 1 ? "winkel" : "winkels"} naast elkaar`
        : "Deze week niets — volg het en zie wanneer het terugkomt",
    deals: offers.slice(0, 3).map((offer) => ({ offer, percent: effectiveDiscountPercent(offer) })),
  });
}
