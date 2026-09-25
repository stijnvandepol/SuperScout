import type { MechanismType, Offer, RetailerInfo, SupermarketSlug } from "@superscout/core";
import { RETAILERS } from "@superscout/core";

/**
 * Presentation facts per chain: name, brand colours, offers link.
 *
 * A view onto the core registry rather than a second copy of it — the copy is
 * what made adding a chain a four-file change.
 */
export type StoreMeta = RetailerInfo;

/** Whether a chain's prices are shown excluding VAT (B2B wholesale). */
export function isExVat(source: SupermarketSlug): boolean {
  return STORE_META[source].exVat === true;
}

/** Brand colours + offers link per chain (kept neutral of any single chain's dominance). */
export const STORE_META: Record<SupermarketSlug, StoreMeta> = RETAILERS;

/** Locally-hosted store icons (their own favicons), used as the store badge. */
export const STORE_ICON: Partial<Record<SupermarketSlug, string>> = Object.fromEntries(
  Object.entries(RETAILERS)
    .filter(([, info]) => (info as RetailerInfo).icon)
    .map(([slug, info]) => [slug, (info as RetailerInfo).icon!]),
);

export const MECHANISM_LABEL: Record<MechanismType, string> = {
  price_drop: "Prijsverlaging",
  multi_buy: "N voor €",
  buy_x_get_y_free: "1+1 & gratis",
  nth_discounted: "2e halve prijs",
  percentage_off: "% korting",
  amount_off: "€ korting",
  cashback: "Cashback",
  free_delivery: "Gratis bezorging",
  unknown: "Overig",
};

/** Integer cents -> Dutch euro string, e.g. 279 -> "€2,79". */
export function formatEuro(cents: number | null): string {
  if (cents === null) return "";
  return "€" + (cents / 100).toFixed(2).replace(".", ",");
}

/** Short, punchy label for the discount sticker. */
export function stickerLabel(offer: Pick<Offer, "mechanism" | "pricing" | "rawLabel">): string {
  const m = offer.mechanism;
  switch (m.type) {
    case "percentage_off":
      return `-${m.percent}%`;
    case "amount_off":
      return `-${formatEuro(m.amountCents)}`;
    case "buy_x_get_y_free":
      return `${m.buyQuantity}+${m.freeQuantity} GRATIS`;
    case "multi_buy":
      return `${m.buyQuantity} VOOR ${formatEuro(m.totalPriceCents)}`;
    case "free_delivery":
      return "GRATIS BEZORGEN";
    case "cashback":
      return "CASHBACK";
    case "nth_discounted":
      return `${m.nth}E -${m.percent}%`;
    case "price_drop":
      return offer.pricing.savingsPercent ? `-${offer.pricing.savingsPercent}%` : "DEAL";
    case "unknown":
      return offer.rawLabel ?? "BONUS";
  }
}

/**
 * What a card says when the chain never told us when the promotion ends.
 *
 * Five of the eight live chains are DOM-scraped and publish their validity as
 * prose ("geldig t/m zondag"), which the normalizers do not extract — so 47% of
 * offers arrive with an empty `validUntil` and the card rendered a blank where
 * the expiry line belongs. A shopper reads that blank as "no idea whether this
 * still counts", which is exactly the doubt the site exists to remove.
 *
 * We cannot invent an end date, but we do know when we last saw the offer on
 * the chain's own page. That is a weaker claim, and a true one.
 */
export function freshnessLabel(fetchedAt: string | null, nowIso: string): string {
  if (!fetchedAt) return "geldigheid onbekend";

  const seen = Date.parse(fetchedAt);
  const now = Date.parse(nowIso);
  if (Number.isNaN(seen) || Number.isNaN(now)) return "geldigheid onbekend";

  const days = Math.floor((now - seen) / 86_400_000);
  if (days <= 0) return "vandaag opgehaald";
  if (days === 1) return "gisteren opgehaald";
  return `opgehaald ${validUntilShort(fetchedAt).replace("t/m ", "")}`;
}

/** "2026-07-07" (or full ISO) -> "t/m 07-07". */
export function validUntilShort(iso: string): string {
  const parts = iso.slice(0, 10).split("-");
  if (parts.length === 3) return `t/m ${parts[2]}-${parts[1]}`;
  return iso;
}

/** Clean URL segment, e.g. "plus:4436-177" -> "plus-4436-177". Reversible: the
 *  source slug never contains a dash, so split on the first dash. */
export function offerSlug(offer: Pick<Offer, "source" | "sourceOfferId">): string {
  return `${offer.source}-${offer.sourceOfferId}`;
}

/** A full-sentence description of the deal, for the product page's terms. */
export function mechanismDescription(offer: Offer): string {
  const m = offer.mechanism;
  switch (m.type) {
    case "percentage_off":
      return `${m.percent}% korting.`;
    case "amount_off":
      return `${formatEuro(m.amountCents)} korting.`;
    case "buy_x_get_y_free":
      return m.buyQuantity === 1 && m.freeQuantity === 1
        ? "1+1 gratis: koop er één, de tweede is gratis."
        : `${m.buyQuantity}+${m.freeQuantity} gratis.`;
    case "multi_buy":
      return `${m.buyQuantity} stuks voor ${formatEuro(m.totalPriceCents)}.`;
    case "free_delivery":
      return `Gratis bezorging vanaf ${formatEuro(m.minSpendCents)}.`;
    case "cashback":
      return `${formatEuro(m.amountCents)} cashback.`;
    case "nth_discounted":
      return `${m.nth}e artikel ${m.percent}% korting.`;
    case "price_drop": {
      const now = formatEuro(offer.pricing.currentPriceCents);
      const was = formatEuro(offer.pricing.originalPriceCents);
      if (now && was) return `Nu ${now}, was ${was}.`;
      if (now) return `Nu ${now}.`;
      return "Tijdelijk in de aanbieding.";
    }
    case "unknown":
      return offer.rawLabel ?? "Bekijk de voorwaarden in de winkel.";
  }
}

/**
 * Where an offer's data came from, in words a shopper understands. Chain
 * adapters read the retailer's own site and set no provenance.
 */
export function provenanceLabel(offer: Pick<Offer, "provenance" | "source">): string {
  switch (offer.provenance) {
    case "partner-feed":
      return `Aangeleverd door ${STORE_META[offer.source].name}`;
    case "affiliate-feed":
      return "Partnerfeed";
    case "manual":
      return "Handmatig ingevoerd";
    default:
      return `Website van ${STORE_META[offer.source].name}`;
  }
}
