import { eurosToCents, type DiscountMechanism } from "@superscout/core";

/**
 * Parse a Jumbo promotion tag into a structured {@link DiscountMechanism}.
 *
 * Jumbo's `nuTab` gives no old/new price — the short tag label *is* the deal.
 * The label families observed in traffic:
 *
 *   "25% korting"   -> percentage_off
 *   "N voor X,YY"   -> multi_buy      (total price for N items, in cents)
 *   "N+M gratis"    -> buy_x_get_y_free
 *
 * Matching is anchored and case/whitespace tolerant. Anything not recognised
 * returns `{ type: "unknown" }`; the original label is preserved on
 * `Offer.rawLabel`, so no information is lost and nothing is guessed.
 *
 * Not yet handled (no real sample captured — intentionally left as `unknown`
 * rather than guessed): single set-price labels ("voor X,YY") and
 * "Ne halve prijs". Add a matcher — with a fixture — once observed.
 */
export function parseJumboMechanism(tagText: string): DiscountMechanism {
  const label = tagText.trim();

  const percentage = PERCENTAGE_OFF.exec(label);
  if (percentage) {
    return { type: "percentage_off", percent: toInt(percentage[1]) };
  }

  const multiBuy = MULTI_BUY.exec(label);
  if (multiBuy) {
    return {
      type: "multi_buy",
      buyQuantity: toInt(multiBuy[1]),
      totalPriceCents: dutchPriceToCents(multiBuy[2]),
    };
  }

  const bogo = BUY_X_GET_Y_FREE.exec(label);
  if (bogo) {
    return {
      type: "buy_x_get_y_free",
      buyQuantity: toInt(bogo[1]),
      freeQuantity: toInt(bogo[2]),
    };
  }

  return { type: "unknown" };
}

const PERCENTAGE_OFF = /^(\d+)\s*%\s*korting$/i;
const MULTI_BUY = /^(\d+)\s*voor\s*€?\s*(\d+(?:,\d{1,2})?)$/i;
const BUY_X_GET_Y_FREE = /^(\d+)\s*\+\s*(\d+)\s*gratis$/i;

/** A regex capture group that the pattern guarantees is present. */
function toInt(group: string | undefined): number {
  return Number.parseInt(group ?? "", 10);
}

/** "4,99" -> 499, "10,00" -> 1000, "5" -> 500. Dutch comma decimals. */
function dutchPriceToCents(group: string | undefined): number {
  return eurosToCents(Number.parseFloat((group ?? "").replace(",", ".")));
}
