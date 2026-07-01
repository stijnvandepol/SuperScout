import { eurosToCents, type DiscountMechanism } from "@superscout/core";

/**
 * Parse a Plus `DisplayInfo_Label` into a structured DiscountMechanism.
 *
 * Observed label families (uppercase, dot decimals):
 *   "N+M GRATIS"                     -> buy_x_get_y_free
 *   "N % KORTING"                    -> percentage_off
 *   "N VOOR X.YY"                    -> multi_buy (total in cents)
 *   "X.YY KORTING"                   -> amount_off
 *   "GRATIS BEZORGING BIJ X.YY EURO" -> free_delivery
 *
 * Everything else (empty label, "0.99 PER KILO", "300 GRAM 3.49") returns
 * unknown; the normalizer applies a price-based price_drop fallback and the
 * raw label is preserved.
 */
export function parsePlusMechanism(label: string): DiscountMechanism {
  const l = label.trim();

  const bogo = BUY_X_GET_Y_FREE.exec(l);
  if (bogo) return { type: "buy_x_get_y_free", buyQuantity: int(bogo[1]), freeQuantity: int(bogo[2]) };

  const pct = PERCENTAGE_OFF.exec(l);
  if (pct) return { type: "percentage_off", percent: int(pct[1]) };

  const amount = AMOUNT_OFF.exec(l);
  if (amount) return { type: "amount_off", amountCents: dotPriceToCents(amount[1]) };

  const multi = MULTI_BUY.exec(l);
  if (multi) return { type: "multi_buy", buyQuantity: int(multi[1]), totalPriceCents: dotPriceToCents(multi[2]) };

  const freeDelivery = FREE_DELIVERY.exec(l);
  if (freeDelivery) return { type: "free_delivery", minSpendCents: dotPriceToCents(freeDelivery[1]) };

  return { type: "unknown" };
}

const BUY_X_GET_Y_FREE = /^(\d+)\s*\+\s*(\d+)\s*gratis$/i;
const PERCENTAGE_OFF = /^(\d+)\s*%\s*korting$/i;
const AMOUNT_OFF = /^(\d+\.\d{2})\s*korting$/i;
const MULTI_BUY = /^(\d+)\s*voor\s*(\d+\.\d{2})$/i;
const FREE_DELIVERY = /^gratis\s+bezorging\s+bij\s*(\d+\.\d{2})\s*euro$/i;

function int(group: string | undefined): number {
  return Number.parseInt(group ?? "", 10);
}

/** "4.99" -> 499, "29.94" -> 2994. Plus uses dot decimals. */
function dotPriceToCents(group: string | undefined): number {
  return eurosToCents(Number.parseFloat(group ?? ""));
}
