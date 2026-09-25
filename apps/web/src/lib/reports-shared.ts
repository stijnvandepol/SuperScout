/** Report vocabulary shared by the form (client) and the API (server). */
export const REPORT_REASONS = {
  "prijs-klopt-niet": "De prijs klopt niet",
  verlopen: "De actie is al afgelopen",
  "niet-in-winkel": "Niet te vinden in de winkel",
  "verkeerde-info": "Verkeerde productinformatie of foto",
  anders: "Iets anders",
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;

export const MAX_NOTE_LENGTH = 500;

export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(REPORT_REASONS, value);
}
