/**
 * Promotion periods differ per chain (AH mon–sun, Jumbo/Plus/Dirk wed–tue,
 * Dirk weekend fri–sun, plus multi-week "seizoen" deals). SuperScout never
 * hardcodes a cycle — it works off each offer's real validFrom/validUntil.
 * These helpers reason about the end date relative to a reference "now".
 *
 * A date-only `validUntil` ("2026-07-07") is treated as valid through the end
 * of that day.
 */

const MS_PER_DAY = 86_400_000;

function endOfValidity(validUntil: string): number {
  // Date-only ends are valid through end of that day; parse as UTC for determinism.
  const iso = validUntil.length <= 10 ? `${validUntil}T23:59:59Z` : validUntil;
  return Date.parse(iso);
}

/** Whole days until the offer expires (1 = expires today, negative = already expired, NaN = unparseable). */
export function daysUntilExpiry(validUntil: string, nowIso: string): number {
  const end = endOfValidity(validUntil);
  const now = Date.parse(nowIso);
  if (Number.isNaN(end) || Number.isNaN(now)) return Number.NaN;
  return Math.ceil((end - now) / MS_PER_DAY);
}

export function isExpired(validUntil: string, nowIso: string): boolean {
  const end = endOfValidity(validUntil);
  const now = Date.parse(nowIso);
  if (Number.isNaN(end) || Number.isNaN(now)) return false;
  return end < now;
}

export function isExpiringSoon(validUntil: string, nowIso: string, thresholdDays = 2): boolean {
  if (isExpired(validUntil, nowIso)) return false;
  const days = daysUntilExpiry(validUntil, nowIso);
  return !Number.isNaN(days) && days <= thresholdDays;
}
