import type { DiscountMechanism } from "./mechanism";
import { eurosToCents } from "./money";

/**
 * Parse a Dutch promotion label into a mechanism.
 *
 * Accepts the forms shoppers and chains both write, with comma or dot
 * decimals and an optional euro sign:
 *
 *   "1+1 gratis", "2 + 1 gratis"         -> buy_x_get_y_free
 *   "2e halve prijs", "2e gratis"         -> nth_discounted
 *   "3 voor €5", "2 voor 3,99"            -> multi_buy
 *   "3 stuks 29.99", "2 stuks voor 5"     -> multi_buy
 *   "25% korting"                         -> percentage_off
 *   "€1,50 korting", "1,50 euro korting"  -> amount_off
 *
 * Written for feed files, and then turned out to be needed for the chains
 * too: AH files most promotions under a generic "BONUS" mechanism and puts
 * the actual deal only in the label text, so 148 of its offers in one pull
 * reached the site as "unknown" — invisible to the 1+1 page, the weekly top
 * and discount sorting. The ingestion runner now uses this as a fallback for
 * every adapter (see `refineMechanism`).
 *
 * Anything else is `unknown`; the label itself is always kept on the offer.
 */
export function parsePromoLabel(label: string): DiscountMechanism {
  const l = label.trim().toLowerCase().replace(/\s+/g, " ");

  const bogo = /^(\d+) ?\+ ?(\d+) gratis$/.exec(l);
  if (bogo) return { type: "buy_x_get_y_free", buyQuantity: int(bogo[1]), freeQuantity: int(bogo[2]) };

  const half = /^(\d+)e (halve prijs|gratis)$/.exec(l);
  if (half) return { type: "nth_discounted", nth: int(half[1]), percent: half[2] === "gratis" ? 100 : 50 };

  const nthPct = /^(\d+)e (\d+) ?% korting$/.exec(l);
  if (nthPct) return { type: "nth_discounted", nth: int(nthPct[1]), percent: int(nthPct[2]) };

  const multi = new RegExp(`^(\\d+) (?:stuks? )?(?:voor )?${EURO}$`).exec(l);
  if (multi && int(multi[1]) > 1) {
    return { type: "multi_buy", buyQuantity: int(multi[1]), totalPriceCents: cents(multi[2]) };
  }

  const pct = /^(\d+) ?% korting$/.exec(l);
  if (pct) return { type: "percentage_off", percent: int(pct[1]) };

  const amount = new RegExp(`^${EURO}(?: euro)? korting$`).exec(l);
  if (amount) return { type: "amount_off", amountCents: cents(amount[1]) };

  return { type: "unknown" };
}

/** An amount with an optional euro sign and comma-or-dot decimals. */
const EURO = "(?:€ ?)?(\\d+(?:[.,]\\d{1,2})?)";

function int(group: string | undefined): number {
  return Number.parseInt(group ?? "", 10);
}

function cents(group: string | undefined): number {
  return eurosToCents(Number.parseFloat((group ?? "").replace(",", ".")));
}

/**
 * Fill in a mechanism the adapter could not structure, from the label text.
 *
 * Only ever upgrades `unknown`: an adapter that parsed its own structured
 * data knows better than a regex over display text.
 */
export function refineMechanism<T extends { mechanism: DiscountMechanism; rawLabel?: string }>(offer: T): T {
  if (offer.mechanism.type !== "unknown" || !offer.rawLabel) return offer;
  const parsed = parsePromoLabel(offer.rawLabel);
  return parsed.type === "unknown" ? offer : { ...offer, mechanism: parsed };
}
