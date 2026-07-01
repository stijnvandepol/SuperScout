/**
 * Money is handled as integer cents everywhere inside SuperScout to avoid
 * floating-point rounding errors (0.99 + 0.99 !== 1.98 in float).
 */

export interface Savings {
  absoluteCents: number | null;
  percent: number | null;
}

/**
 * Convert a euro amount (as the source APIs give it, e.g. 0.99, 2.79) to
 * integer cents. Must round, because `euros * 100` is not exact in float
 * (0.99 * 100 === 98.99999999999999).
 */
export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

/**
 * Compute absolute (cents) and percentage savings from a current and original
 * price. Returns nulls when savings cannot be determined (no/zero reference price).
 */
export function computeSavings(
  currentCents: number | null,
  originalCents: number | null,
): Savings {
  if (currentCents === null || originalCents === null || originalCents <= 0) {
    return { absoluteCents: null, percent: null };
  }
  const absoluteCents = originalCents - currentCents;
  const percent = Math.round((absoluteCents / originalCents) * 100);
  return { absoluteCents, percent };
}
