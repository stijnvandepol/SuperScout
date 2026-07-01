/**
 * How a discount is expressed. A discriminated union so filters can be exact
 * (e.g. "only 1+1" = type === "buy_x_get_y_free" && buyQuantity === 1 && freeQuantity === 1)
 * and so new mechanisms can be added without breaking existing consumers.
 *
 * The raw source label is always kept alongside on `Offer.rawLabel`, so an
 * unrecognised variant degrades to `{ type: "unknown" }` without losing data.
 */
export type DiscountMechanism =
  | { type: "price_drop" }
  | { type: "multi_buy"; buyQuantity: number; totalPriceCents: number }
  | { type: "buy_x_get_y_free"; buyQuantity: number; freeQuantity: number }
  | { type: "nth_discounted"; nth: number; percent: number }
  | { type: "percentage_off"; percent: number }
  | { type: "amount_off"; amountCents: number }
  | { type: "cashback"; amountCents: number }
  | { type: "free_delivery"; minSpendCents: number }
  | { type: "unknown" };

export type MechanismType = DiscountMechanism["type"];
