/**
 * Server-side switch for the analytics script. Read at request time so an
 * operator can turn it on or off with an environment variable and a restart,
 * without a rebuild.
 */
export interface AnalyticsConfig {
  domain: string;
  scriptSrc: string;
}

export function analyticsConfig(): AnalyticsConfig | null {
  const domain = process.env.ANALYTICS_DOMAIN?.trim();
  if (!domain) return null;
  const scriptSrc = process.env.ANALYTICS_SCRIPT_SRC?.trim() || "https://plausible.io/js/script.js";
  // Only https sources: this tag runs on every page.
  if (!/^https:\/\//.test(scriptSrc)) return null;
  return { domain, scriptSrc };
}
