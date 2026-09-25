/**
 * Every retailer SuperScout knows about, in one place.
 *
 * Adding a chain used to mean touching four files: the slug list here, brand
 * colours and the offers link in the web app, the icon map next to it, and an
 * adapter. Three of those are facts *about the retailer*, not about how we
 * fetch it, so they live together now. A new retailer is one entry below plus
 * a data source — an adapter, or a feed file (see ingestion's feed adapter),
 * which needs no code at all.
 *
 * An entry does not make a retailer visible. The site shows only chains that
 * have live offers (apps/web/src/lib/chains.ts), so listing Kruidvat here
 * before there is data for it costs nothing and promises nothing.
 *
 * Slugs must not contain a dash: offer URLs are `${source}-${sourceOfferId}`
 * and are split on the first dash. A test pins this.
 */

/**
 * What kind of shop a retailer is.
 *
 * Drives grouping and wording ("supermarkten" versus "winkels"), never
 * ranking. Deliberately coarse: a sector is a shopping trip, not a taxonomy,
 * and HEMA sits in `warenhuis` even though it sells sandwiches.
 */
export const SECTORS = [
  { slug: "supermarkt", label: "Supermarkten", noun: "supermarkt" },
  { slug: "groothandel", label: "Groothandel", noun: "groothandel" },
  { slug: "drogisterij", label: "Drogisterijen", noun: "drogisterij" },
  { slug: "warenhuis", label: "Warenhuizen & discounters", noun: "winkel" },
  { slug: "bouwmarkt", label: "Bouwmarkten & tuin", noun: "bouwmarkt" },
] as const;

export type SectorSlug = (typeof SECTORS)[number]["slug"];

export interface RetailerInfo {
  name: string;
  sector: SectorSlug;
  /** Whether a live data source produces offers for this retailer. */
  ingested: boolean;
  /** Brand colours for the store chip. */
  bg: string;
  fg: string;
  /**
   * Where "Bekijk bij {store}" sends the shopper. For retailers that are not
   * live yet this is the homepage; point it at the offers page when they go
   * live, since that URL is shown to visitors.
   */
  offersUrl: string;
  /** Locally hosted favicon under apps/web/public, when we have one. */
  icon?: string;
  /** Wholesalers list prices excluding VAT — flagged everywhere they appear. */
  exVat?: boolean;
}

function retailer(info: RetailerInfo): RetailerInfo {
  return info;
}

export const RETAILERS = {
  // ---- Supermarkten ----
  ah: retailer({ name: "Albert Heijn", sector: "supermarkt", ingested: true, bg: "#00a0e2", fg: "#ffffff", offersUrl: "https://www.ah.nl/bonus", icon: "/store-icons/ah.png" }),
  jumbo: retailer({ name: "Jumbo", sector: "supermarkt", ingested: true, bg: "#eeb500", fg: "#1a1500", offersUrl: "https://www.jumbo.com/aanbiedingen", icon: "/store-icons/jumbo.png" }),
  lidl: retailer({ name: "Lidl", sector: "supermarkt", ingested: true, bg: "#0050aa", fg: "#ffffff", offersUrl: "https://www.lidl.nl/c/aanbiedingen/s10005610", icon: "/store-icons/lidl.png" }),
  aldi: retailer({ name: "ALDI", sector: "supermarkt", ingested: true, bg: "#1e3a8a", fg: "#ffffff", offersUrl: "https://www.aldi.nl/aanbiedingen.html", icon: "/store-icons/aldi.png" }),
  plus: retailer({ name: "PLUS", sector: "supermarkt", ingested: true, bg: "#00814b", fg: "#ffffff", offersUrl: "https://www.plus.nl/aanbiedingen", icon: "/store-icons/plus.ico" }),
  dirk: retailer({ name: "Dirk", sector: "supermarkt", ingested: true, bg: "#e30613", fg: "#ffffff", offersUrl: "https://www.dirk.nl/aanbiedingen", icon: "/store-icons/dirk.png" }),
  hoogvliet: retailer({ name: "Hoogvliet", sector: "supermarkt", ingested: true, bg: "#e2001a", fg: "#ffffff", offersUrl: "https://www.hoogvliet.com/aanbiedingen", icon: "/store-icons/hoogvliet.png" }),
  dekamarkt: retailer({ name: "DekaMarkt", sector: "supermarkt", ingested: true, bg: "#004b93", fg: "#ffffff", offersUrl: "https://www.dekamarkt.nl/aanbiedingen", icon: "/store-icons/dekamarkt.png" }),
  vomar: retailer({ name: "Vomar", sector: "supermarkt", ingested: false, bg: "#d4021d", fg: "#ffffff", offersUrl: "https://www.vomar.nl/aanbiedingen" }),
  coop: retailer({ name: "Coop", sector: "supermarkt", ingested: false, bg: "#e2001a", fg: "#ffffff", offersUrl: "https://www.coop.nl/aanbiedingen" }),
  spar: retailer({ name: "Spar", sector: "supermarkt", ingested: false, bg: "#009640", fg: "#ffffff", offersUrl: "https://www.spar.nl/aanbiedingen" }),
  ekoplaza: retailer({ name: "Ekoplaza", sector: "supermarkt", ingested: false, bg: "#4b9b3f", fg: "#ffffff", offersUrl: "https://www.ekoplaza.nl/aanbiedingen" }),
  poiesz: retailer({ name: "Poiesz", sector: "supermarkt", ingested: true, bg: "#5a9e2f", fg: "#ffffff", offersUrl: "https://webwinkel.poiesz-supermarkten.nl/aanbiedingen", icon: "/store-icons/poiesz.png" }),

  // ---- Groothandel ----
  sligro: retailer({ name: "Sligro", sector: "groothandel", ingested: true, bg: "#e64415", fg: "#ffffff", offersUrl: "https://www.sligro.nl/aanbiedingen.html", icon: "/store-icons/sligro.png", exVat: true }),

  // ---- Drogisterijen (nog geen databron; zie docs/VERBETERPLAN.md) ----
  kruidvat: retailer({ name: "Kruidvat", sector: "drogisterij", ingested: false, bg: "#e2001a", fg: "#ffffff", offersUrl: "https://www.kruidvat.nl" }),
  etos: retailer({ name: "Etos", sector: "drogisterij", ingested: false, bg: "#d6002a", fg: "#ffffff", offersUrl: "https://www.etos.nl" }),
  trekpleister: retailer({ name: "Trekpleister", sector: "drogisterij", ingested: false, bg: "#e4007c", fg: "#ffffff", offersUrl: "https://www.trekpleister.nl" }),
  da: retailer({ name: "DA", sector: "drogisterij", ingested: false, bg: "#00893d", fg: "#ffffff", offersUrl: "https://www.da.nl" }),

  // ---- Warenhuizen & discounters ----
  action: retailer({ name: "Action", sector: "warenhuis", ingested: false, bg: "#0050a0", fg: "#ffffff", offersUrl: "https://www.action.com/nl-nl/" }),
  hema: retailer({ name: "HEMA", sector: "warenhuis", ingested: false, bg: "#e30613", fg: "#ffffff", offersUrl: "https://www.hema.nl" }),
  blokker: retailer({ name: "Blokker", sector: "warenhuis", ingested: false, bg: "#e2001a", fg: "#ffffff", offersUrl: "https://www.blokker.nl" }),
  zeeman: retailer({ name: "Zeeman", sector: "warenhuis", ingested: false, bg: "#1d3f8f", fg: "#ffffff", offersUrl: "https://www.zeeman.com/nl" }),

  // ---- Bouwmarkten ----
  gamma: retailer({ name: "GAMMA", sector: "bouwmarkt", ingested: false, bg: "#003f8a", fg: "#ffffff", offersUrl: "https://www.gamma.nl" }),
  karwei: retailer({ name: "KARWEI", sector: "bouwmarkt", ingested: false, bg: "#f18700", fg: "#1a1000", offersUrl: "https://www.karwei.nl" }),
  praxis: retailer({ name: "Praxis", sector: "bouwmarkt", ingested: false, bg: "#e30613", fg: "#ffffff", offersUrl: "https://www.praxis.nl" }),
  hornbach: retailer({ name: "HORNBACH", sector: "bouwmarkt", ingested: false, bg: "#f7931e", fg: "#1a1000", offersUrl: "https://www.hornbach.nl" }),
} as const satisfies Record<string, RetailerInfo>;

export type RetailerSlug = keyof typeof RETAILERS;

export const RETAILER_SLUGS = Object.keys(RETAILERS) as RetailerSlug[];

export function isRetailerSlug(value: string): value is RetailerSlug {
  return Object.prototype.hasOwnProperty.call(RETAILERS, value);
}

export function retailerInfo(slug: RetailerSlug): RetailerInfo {
  return RETAILERS[slug];
}

export function sectorOf(slug: RetailerSlug): SectorSlug {
  return RETAILERS[slug].sector;
}

export const SECTOR_LABEL = Object.fromEntries(SECTORS.map((s) => [s.slug, s.label])) as Record<
  SectorSlug,
  string
>;

/**
 * How to name a set of retailers in running Dutch.
 *
 * "Vergelijk bij 9 supermarkten" stops being true the day Kruidvat goes live,
 * and copy that names the wrong kind of shop reads as a template. Sligro is a
 * wholesaler but shoppers compare it with supermarkets, so it does not break
 * the supermarket wording on its own.
 */
export function retailerNoun(slugs: Iterable<RetailerSlug>, plural = true): string {
  const sectors = new Set([...slugs].map(sectorOf));
  sectors.delete("groothandel");
  const onlySupermarkets = sectors.size === 0 || (sectors.size === 1 && sectors.has("supermarkt"));
  if (onlySupermarkets) return plural ? "supermarkten" : "supermarkt";
  return plural ? "winkels" : "winkel";
}
