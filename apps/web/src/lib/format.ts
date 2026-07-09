import type { MechanismType, Offer, SupermarketSlug } from "@superscout/core";

export interface StoreMeta {
  name: string;
  bg: string;
  fg: string;
  /** Where "Open bij {store}" sends the shopper (opens the app via universal links). */
  offersUrl: string;
  /** Wholesalers (Sligro/Makro) list prices excluding VAT — flag it everywhere. */
  exVat?: boolean;
}

/** Whether a chain's prices are shown excluding VAT (B2B wholesale). */
export function isExVat(source: SupermarketSlug): boolean {
  return STORE_META[source].exVat === true;
}

/** Locally-hosted store icons (their own favicons), used as the store badge. */
export const STORE_ICON: Partial<Record<SupermarketSlug, string>> = {
  ah: "/store-icons/ah.png",
  jumbo: "/store-icons/jumbo.png",
  lidl: "/store-icons/lidl.png",
  aldi: "/store-icons/aldi.png",
  plus: "/store-icons/plus.ico",
  dirk: "/store-icons/dirk.png",
  hoogvliet: "/store-icons/hoogvliet.png",
  dekamarkt: "/store-icons/dekamarkt.png",
  poiesz: "/store-icons/poiesz.png",
  sligro: "/store-icons/sligro.png",
};

/** Brand colours + offers link per chain (kept neutral of any single chain's dominance). */
export const STORE_META: Record<SupermarketSlug, StoreMeta> = {
  ah: { name: "Albert Heijn", bg: "#00a0e2", fg: "#ffffff", offersUrl: "https://www.ah.nl/bonus" },
  jumbo: { name: "Jumbo", bg: "#eeb500", fg: "#1a1500", offersUrl: "https://www.jumbo.com/aanbiedingen" },
  lidl: { name: "Lidl", bg: "#0050aa", fg: "#ffffff", offersUrl: "https://www.lidl.nl/c/aanbiedingen/s10005610" },
  aldi: { name: "ALDI", bg: "#1e3a8a", fg: "#ffffff", offersUrl: "https://www.aldi.nl/aanbiedingen.html" },
  plus: { name: "PLUS", bg: "#00814b", fg: "#ffffff", offersUrl: "https://www.plus.nl/aanbiedingen" },
  dirk: { name: "Dirk", bg: "#e30613", fg: "#ffffff", offersUrl: "https://www.dirk.nl/aanbiedingen" },
  hoogvliet: { name: "Hoogvliet", bg: "#e2001a", fg: "#ffffff", offersUrl: "https://www.hoogvliet.com/aanbiedingen" },
  dekamarkt: { name: "DekaMarkt", bg: "#004b93", fg: "#ffffff", offersUrl: "https://www.dekamarkt.nl/aanbiedingen" },
  vomar: { name: "Vomar", bg: "#d4021d", fg: "#ffffff", offersUrl: "https://www.vomar.nl/aanbiedingen" },
  coop: { name: "Coop", bg: "#e2001a", fg: "#ffffff", offersUrl: "https://www.coop.nl/aanbiedingen" },
  spar: { name: "Spar", bg: "#009640", fg: "#ffffff", offersUrl: "https://www.spar.nl/aanbiedingen" },
  ekoplaza: { name: "Ekoplaza", bg: "#4b9b3f", fg: "#ffffff", offersUrl: "https://www.ekoplaza.nl/aanbiedingen" },
  poiesz: { name: "Poiesz", bg: "#5a9e2f", fg: "#ffffff", offersUrl: "https://webwinkel.poiesz-supermarkten.nl/aanbiedingen" },
  sligro: { name: "Sligro", bg: "#e64415", fg: "#ffffff", offersUrl: "https://www.sligro.nl/aanbiedingen.html", exVat: true },
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

/** Clean URL segment, e.g. "plus:4436-177" -> "plus-4436-177". Reversible: the
 *  source slug never contains a dash, so split on the first dash. */
export function offerSlug(offer: Offer): string {
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
