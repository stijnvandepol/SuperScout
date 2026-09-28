import { eurosToCents, type DiscountMechanism } from "@superscout/core";
import type { AhRawPromotionLabel } from "./ah.raw";

/**
 * Map an AH structured promotion label to a DiscountMechanism.
 *
 * Grounded in observed labels:
 *   ONE_FREE (count N)          -> buy_x_get_y_free (buy N-freeCount, get freeCount)
 *   FREE_DELIVERY_AMOUNT (€ amt)-> free_delivery (min spend in cents)
 *
 * Not mapped (no clean fit / not sampled) -> unknown: BONUS (generic),
 * FREE_DELIVERY (by item count, not spend), and any future mechanism. The
 * original label text is preserved on Offer.rawLabel.
 */
export function parseAhMechanism(label: AhRawPromotionLabel | undefined): DiscountMechanism {
  if (!label) return { type: "unknown" };

  switch (label.mechanism) {
    case "ONE_FREE": {
      // "Nth free": count is the total, freeCount how many are free (default 1).
      const freeQuantity = label.freeCount ?? 1;
      const total = label.count ?? freeQuantity + 1;
      const buyQuantity = Math.max(1, total - freeQuantity);
      return { type: "buy_x_get_y_free", buyQuantity, freeQuantity };
    }
    case "FREE_DELIVERY_AMOUNT":
      return {
        type: "free_delivery",
        minSpendCents: label.amount != null ? eurosToCents(label.amount) : 0,
      };
    default:
      return { type: "unknown" };
  }
}
