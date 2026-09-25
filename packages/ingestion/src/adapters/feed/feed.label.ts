import { eurosToCents, type DiscountMechanism } from "@superscout/core";

/**
 * Parse a human-written promotion label into a mechanism.
 *
 * The chain adapters each parse one chain's house style ("2 VOOR 3.99",
 * "1+1 GRATIS"). Feed files are written by people and partners, so this
 * accepts the forms a Dutch shopper would type, with comma or dot decimals and
 * an optional euro sign:
 *
 *   "1+1 gratis", "2 + 1 gratis"         -> buy_x_get_y_free
 *   "2e halve prijs", "2e gratis"         -> nth_discounted
 *   "3 voor €5", "2 voor 3,99"            -> multi_buy
 *   "25% korting"                         -> percentage_off
 *   "€1,50 korting", "1,50 euro korting"  -> amount_off
 *
 * Anything else is `unknown`; the label itself is always kept on the offer, so
 * nothing a person typed is lost.
 */
export function parseFeedLabel(label: string): DiscountMechanism {
  const l = label.trim().toLowerCase().replace(/\s+/g, " ");

  const bogo = /^(\d+) ?\+ ?(\d+) gratis$/.exec(l);
  if (bogo) return { type: "buy_x_get_y_free", buyQuantity: int(bogo[1]), freeQuantity: int(bogo[2]) };

  const half = /^(\d+)e (halve prijs|gratis)$/.exec(l);
  if (half) return { type: "nth_discounted", nth: int(half[1]), percent: half[2] === "gratis" ? 100 : 50 };

  const nthPct = /^(\d+)e (\d+) ?% korting$/.exec(l);
  if (nthPct) return { type: "nth_discounted", nth: int(nthPct[1]), percent: int(nthPct[2]) };

  const multi = new RegExp(`^(\\d+) voor ${EURO}$`).exec(l);
  if (multi) return { type: "multi_buy", buyQuantity: int(multi[1]), totalPriceCents: cents(multi[2]) };

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
