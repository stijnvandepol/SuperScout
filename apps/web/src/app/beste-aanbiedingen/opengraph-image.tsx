import { isoWeekNumber, weeklyPicks } from "@superscout/core";
import { getOffers } from "@/lib/offers";
import { dealCard, OG_SIZE } from "@/lib/og";

export const alt = "De beste aanbiedingen van deze week op SuperScout";
export const size = OG_SIZE;
export const contentType = "image/png";
// Per request: the card shows this week's picks, which do not exist at build time.
export const dynamic = "force-dynamic";

export default function Image() {
  const now = new Date();
  const picks = weeklyPicks(getOffers(), { nowIso: now.toISOString(), limit: 3 });
  return dealCard({
    eyebrow: `Week ${isoWeekNumber(now)}`,
    title: "De beste aanbiedingen van deze week",
    subtitle: "De scherpste kortingen van alle winkels op een rij",
    deals: picks.map((p) => ({ offer: p.offer, percent: p.discountPercent })),
  });
}
