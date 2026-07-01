import type { MechanismType, Offer, SupermarketSlug } from "@superscout/core";

export interface StoreMeta {
  name: string;
  bg: string;
  fg: string;
}

/** Brand colours for the store chips (kept neutral of any single chain's dominance). */
export const STORE_META: Record<SupermarketSlug, StoreMeta> = {
  ah: { name: "Albert Heijn", bg: "#00a0e2", fg: "#ffffff" },
  jumbo: { name: "Jumbo", bg: "#eeb500", fg: "#1a1500" },
  lidl: { name: "Lidl", bg: "#0050aa", fg: "#ffffff" },
  aldi: { name: "ALDI", bg: "#1e3a8a", fg: "#ffffff" },
  plus: { name: "PLUS", bg: "#00814b", fg: "#ffffff" },
  dirk: { name: "Dirk", bg: "#e30613", fg: "#ffffff" },
  hoogvliet: { name: "Hoogvliet", bg: "#e2001a", fg: "#ffffff" },
  dekamarkt: { name: "DekaMarkt", bg: "#004b93", fg: "#ffffff" },
  vomar: { name: "Vomar", bg: "#d4021d", fg: "#ffffff" },
  coop: { name: "Coop", bg: "#e2001a", fg: "#ffffff" },
  spar: { name: "Spar", bg: "#009640", fg: "#ffffff" },
};

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
export function stickerLabel(offer: Offer): string {
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

/** "2026-07-07" (or full ISO) -> "t/m 07-07". */
export function validUntilShort(iso: string): string {
  const parts = iso.slice(0, 10).split("-");
  if (parts.length === 3) return `t/m ${parts[2]}-${parts[1]}`;
  return iso;
}
