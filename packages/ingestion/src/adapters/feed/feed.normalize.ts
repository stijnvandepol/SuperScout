import type { DiscountMechanism, Offer, OfferProvenance, RetailerSlug } from "@superscout/core";
import { computeSavings, isRetailerSlug, priceKey, RETAILERS } from "@superscout/core";
import { parseFeedLabel } from "./feed.label";

/**
 * Offers from a file instead of a scraper.
 *
 * Every chain adapter so far reads a retailer's own website, which is the
 * right tool for supermarkets and the wrong one for most of what comes next:
 * drugstores, HEMA, Action and DIY chains are better reached through a partner
 * feed, an affiliate network's product feed, or a person entering a curated
 * set by hand. All three produce the same thing — a list of promotions — so
 * they share one format and one validator, and adding a retailer through any
 * of them needs no code.
 *
 * The validator is the product here. A feed is written by someone who is not
 * us, and this site's whole promise is that its prices are not misleading. So
 * it is strict where a mistake would mislead (a "was" price that is not
 * higher, a promotion without an end date, a link to a domain that is not the
 * retailer's) and forgiving everywhere else: one bad row is dropped and
 * reported, never allowed to take the rest of the file down.
 */

/** The file as a partner, a network export or a person writes it. */
export interface FeedFile {
  /** Registry slug, e.g. "kruidvat". Must match the file name prefix. */
  retailer: string;
  provenance: OfferProvenance;
  /**
   * The legal basis for using this data, in words: "schriftelijke toestemming
   * van X d.d. ...", "Awin publisher agreement #...", "handmatig overgenomen
   * uit de folder, geen afbeeldingen". Required, because a feed whose right of
   * use nobody wrote down is a feed nobody checked.
   */
  licence: string;
  /** When a human or the partner last confirmed these offers, ISO 8601. */
  updatedAt: string;
  offers: FeedOffer[];
}

export interface FeedOffer {
  id: string;
  title: string;
  brand?: string;
  /** Free text; our category is derived from title + this, as for any chain. */
  category?: string;
  imageUrl?: string;
  url?: string;
  priceCents?: number | null;
  originalPriceCents?: number | null;
  /** "1+1 gratis", "2e halve prijs", "3 voor €5", "25% korting". */
  label?: string;
  validFrom: string;
  validUntil: string;
  eans?: string[];
}

export interface FeedResult {
  retailer: RetailerSlug;
  offers: Offer[];
  /** Human-readable reasons rows were dropped or fields were ignored. */
  issues: string[];
}

/**
 * A promotion that runs longer than this is not a promotion.
 *
 * Also the expiry guarantee: every feed offer carries an end date no further
 * out than this, so a forgotten file cannot keep a price on the site forever.
 */
export const MAX_FEED_VALIDITY_DAYS = 62;

/**
 * How long a file may go unconfirmed before it stops publishing.
 *
 * Same reasoning as the bundled seed's age guard in the web app: a missing
 * retailer is a gap, a stale price is a lie. Two weeks covers a skipped
 * weekly update without covering an abandoned one.
 */
export const MAX_FEED_AGE_DAYS = 14;

const PROVENANCES: readonly OfferProvenance[] = ["partner-feed", "affiliate-feed", "manual"];
const ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const DAY_MS = 86_400_000;

/** Throws on problems with the file as a whole; drops and reports bad rows. */
export function normalizeFeed(
  raw: unknown,
  opts: { nowIso: string; expectedRetailer?: string },
): FeedResult {
  const file = raw as Partial<FeedFile> | null;
  if (!file || typeof file !== "object") throw new Error("feed is geen JSON-object");

  const retailer = String(file.retailer ?? "");
  if (!isRetailerSlug(retailer)) {
    throw new Error(`onbekende retailer "${retailer}" — voeg hem eerst toe aan core/src/retailer.ts`);
  }
  if (opts.expectedRetailer && opts.expectedRetailer !== retailer) {
    throw new Error(`bestandsnaam hoort bij "${opts.expectedRetailer}", inhoud zegt "${retailer}"`);
  }
  if (!PROVENANCES.includes(file.provenance as OfferProvenance)) {
    throw new Error(`provenance moet een van ${PROVENANCES.join(", ")} zijn`);
  }
  if (typeof file.licence !== "string" || file.licence.trim().length < 5) {
    throw new Error("licence ontbreekt: leg vast op welke grond deze data gebruikt mag worden");
  }

  const updated = Date.parse(String(file.updatedAt ?? ""));
  const now = Date.parse(opts.nowIso);
  if (Number.isNaN(updated)) throw new Error("updatedAt ontbreekt of is geen datum");
  if ((now - updated) / DAY_MS > MAX_FEED_AGE_DAYS) {
    throw new Error(`updatedAt is ouder dan ${MAX_FEED_AGE_DAYS} dagen — bestand wordt niet gepubliceerd`);
  }
  if (!Array.isArray(file.offers)) throw new Error("offers ontbreekt of is geen lijst");

  const provenance = file.provenance as OfferProvenance;
  const fetchedAt = new Date(updated).toISOString();
  const issues: string[] = [];
  const byId = new Map<string, Offer>();

  for (const [index, row] of file.offers.entries()) {
    const where = `regel ${index + 1}${row && typeof row.id === "string" ? ` (${row.id})` : ""}`;
    const result = normalizeRow(row, retailer, provenance, fetchedAt);
    if (typeof result === "string") {
      issues.push(`${where}: ${result}`);
      continue;
    }
    for (const note of result.notes) issues.push(`${where}: ${note}`);
    if (byId.has(result.offer.id)) issues.push(`${where}: dubbel id, de laatste telt`);
    byId.set(result.offer.id, result.offer);
  }

  return { retailer, offers: dropDuplicateProducts([...byId.values()], issues), issues };
}

type RowResult = { offer: Offer; notes: string[] } | string;

function normalizeRow(
  row: FeedOffer | undefined,
  retailer: RetailerSlug,
  provenance: OfferProvenance,
  fetchedAt: string,
): RowResult {
  if (!row || typeof row !== "object") return "geen object";
  if (typeof row.id !== "string" || !ID_PATTERN.test(row.id)) return "id ontbreekt of bevat vreemde tekens";

  const title = typeof row.title === "string" ? row.title.trim() : "";
  if (title.length < 2 || title.length > 200) return "titel ontbreekt of is te lang";

  const from = dateOnly(row.validFrom);
  const until = dateOnly(row.validUntil);
  if (!from || !until) return "validFrom en validUntil zijn verplicht (JJJJ-MM-DD)";
  const span = (Date.parse(until) - Date.parse(from)) / DAY_MS;
  if (span < 0) return "validUntil ligt voor validFrom";
  if (span > MAX_FEED_VALIDITY_DAYS) return `looptijd langer dan ${MAX_FEED_VALIDITY_DAYS} dagen`;

  const notes: string[] = [];
  const current = cents(row.priceCents);
  let original = cents(row.originalPriceCents);
  if (row.priceCents != null && current === null) return "priceCents is geen geheel aantal centen";

  // The one check that protects the shopper most: a "was" price that is not
  // higher than the current one advertises a discount that does not exist.
  if (original !== null && (current === null || original <= current)) {
    notes.push("originalPriceCents is niet hoger dan priceCents en wordt genegeerd");
    original = null;
  }

  const savings = computeSavings(current, original);
  if (savings.percent !== null && savings.percent > 90) {
    return `korting van ${savings.percent}% is ongeloofwaardig — controleer de prijzen`;
  }

  const label = typeof row.label === "string" && row.label.trim() ? row.label.trim() : undefined;
  let mechanism: DiscountMechanism = label ? parseFeedLabel(label) : { type: "unknown" };
  if (mechanism.type === "unknown" && original !== null) mechanism = { type: "price_drop" };
  if (mechanism.type === "unknown" && !label) return "geen actie: geef een label of een hogere originalPriceCents";

  const url = checkedUrl(row.url, retailer, provenance, notes, "url");
  const imageUrl = checkedUrl(row.imageUrl, null, provenance, notes, "imageUrl");
  const eans = Array.isArray(row.eans) ? row.eans.filter((e) => /^\d{8,14}$/.test(String(e))) : [];

  const offer: Offer = {
    id: `${retailer}:${row.id}`,
    source: retailer,
    sourceOfferId: row.id,
    title,
    ...(typeof row.brand === "string" && row.brand.trim() ? { brand: row.brand.trim() } : {}),
    ...(typeof row.category === "string" && row.category.trim()
      ? { sourceCategoryRaw: row.category.trim() }
      : {}),
    ...(imageUrl ? { imageUrl } : {}),
    pricing: {
      currentPriceCents: current,
      originalPriceCents: original,
      savingsAbsoluteCents: savings.absoluteCents,
      savingsPercent: savings.percent,
    },
    mechanism,
    ...(label ? { rawLabel: label } : {}),
    validFrom: from,
    validUntil: until,
    flags: {},
    ...(url ? { url } : {}),
    ...(eans.length ? { productEans: eans.map(String) } : {}),
    fetchedAt,
    provenance,
  };
  return { offer, notes };
}

/**
 * The same product twice in one file, under two ids.
 *
 * Happens when a partner exports per store region or a person pastes a week
 * twice. Keyed like the price history (chain + normalised title) plus the end
 * date, so a genuinely re-run promotion in a later week is not a duplicate.
 * The cheaper of the two wins, which is also what a shopper would pick.
 */
function dropDuplicateProducts(offers: Offer[], issues: string[]): Offer[] {
  const kept = new Map<string, Offer>();
  for (const offer of offers) {
    const key = `${priceKey(offer) ?? offer.id}|${offer.validUntil}`;
    const existing = kept.get(key);
    if (!existing) {
      kept.set(key, offer);
      continue;
    }
    const price = (o: Offer) => o.pricing.currentPriceCents ?? Number.POSITIVE_INFINITY;
    const winner = price(offer) < price(existing) ? offer : existing;
    const loser = winner === offer ? existing : offer;
    issues.push(`${loser.sourceOfferId}: zelfde product als ${winner.sourceOfferId}, overgeslagen`);
    kept.set(key, winner);
  }
  return [...kept.values()];
}

function dateOnly(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  if (!match || Number.isNaN(Date.parse(match[1]!))) return null;
  return match[1]!;
}

function cents(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

/** The retailer's own registrable domain, e.g. "kruidvat.nl". */
function retailerDomain(retailer: RetailerSlug): string {
  return new URL(RETAILERS[retailer].offersUrl).hostname.split(".").slice(-2).join(".");
}

/**
 * Only https, and outbound product links only to the retailer itself.
 *
 * A feed that can put any link on a "Bekijk bij Kruidvat" button can send
 * shoppers anywhere. Affiliate feeds are the exception by construction — their
 * links go through the network's redirector — and are labelled as such on
 * the page. Images may come from a CDN, so they are only held to https.
 */
function checkedUrl(
  value: unknown,
  retailer: RetailerSlug | null,
  provenance: OfferProvenance,
  notes: string[],
  field: string,
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  let parsed: URL;
  try {
    parsed = new URL(String(value));
  } catch {
    notes.push(`${field} is geen geldige URL en wordt genegeerd`);
    return undefined;
  }
  if (parsed.protocol !== "https:") {
    notes.push(`${field} is geen https en wordt genegeerd`);
    return undefined;
  }
  if (retailer && provenance !== "affiliate-feed") {
    const domain = retailerDomain(retailer);
    if (parsed.hostname !== domain && !parsed.hostname.endsWith(`.${domain}`)) {
      notes.push(`${field} wijst niet naar ${domain} en wordt genegeerd`);
      return undefined;
    }
  }
  return parsed.toString();
}
