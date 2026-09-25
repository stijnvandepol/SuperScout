/**
 * Product analytics — off unless the operator turns it on.
 *
 * SuperScout promises no tracking, and that promise is about people. What the
 * site still cannot answer is which searches find nothing, whether anyone
 * uses the share button, or which store gets the click-through. Those are
 * questions about the product, and a cookieless, aggregate-only counter
 * (Plausible, self-hosted or EU-hosted) answers them without a profile, an
 * identifier or a cookie banner.
 *
 * So this is wiring, not a decision: with ANALYTICS_DOMAIN unset, no script is
 * loaded and every `track` call is a no-op. Setting it also switches the
 * privacy page to the wording that describes it — see app/privacy/page.tsx.
 */

/** Event names, in Dutch because they are read by the person running the site. */
export type AnalyticsEvent =
  | "Zoekopdracht"
  | "Filter"
  | "Doorklik winkel"
  | "Mandje"
  | "Volg zoekterm"
  | "Volglijst bekeken"
  | "Aanbieding gedeeld"
  | "Lijst gedeeld"
  | "Fout gemeld";

type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Props }) => void;
  }
}

/** Fire-and-forget. Never throws, never blocks the interaction it describes. */
export function track(event: AnalyticsEvent, props?: Props): void {
  if (typeof window === "undefined") return;
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {
    // An analytics failure must never become a user-facing failure.
  }
}

/**
 * Bucket a count so an event says "0", "1-5", "6-20" or "20+" rather than an
 * exact number: enough to spot zero-result searches, too coarse to be a
 * fingerprint.
 */
export function countBucket(n: number): string {
  if (n === 0) return "0";
  if (n <= 5) return "1-5";
  if (n <= 20) return "6-20";
  return "20+";
}
