/**
 * Weekly content generator.
 *
 * Turns the offer set that already powers the site into ready-to-post copy for
 * the channels in docs/MARKETING.md. The point is that the marketing effort
 * becomes a one-off (write the generator) rather than a weekly chore, which is
 * the only shape that survives a solo maintainer.
 *
 *   node dist/content.cjs --format markdown          # Reddit / Tweakers
 *   node dist/content.cjs --format social            # Instagram / TikTok
 *   node dist/content.cjs --format json --limit 20   # further automation
 *
 * Reads OFFERS_PATH (the file the ingestion worker writes) or --offers.
 */

import { readFileSync } from "node:fs";
import type { Offer } from "@superscout/core";
import {
  categorizeOffer,
  CATEGORY_LABEL,
  isoWeekNumber,
  supermarketName,
  weeklyPicks,
  type WeeklyPick,
} from "@superscout/core";

const SITE_URL = "https://superscout.nl";

type Format = "markdown" | "social" | "json";

interface Args {
  format: Format;
  limit: number;
  offersPath: string;
  nowIso: string;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const format = (get("--format") ?? "markdown") as Format;
  if (!["markdown", "social", "json"].includes(format)) {
    throw new Error(`Unknown --format "${format}" (markdown | social | json)`);
  }

  const limitRaw = get("--limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 10;
  if (!Number.isFinite(limit) || limit <= 0) throw new Error(`Invalid --limit "${limitRaw}"`);

  const offersPath =
    get("--offers") ?? process.env.OFFERS_PATH ?? "apps/web/src/data/offers.json";

  // Injectable so a run can be reproduced exactly when checking last week's output.
  const nowIso = get("--now") ?? new Date().toISOString();

  return { format, limit, offersPath, nowIso };
}

function loadOffers(path: string): Offer[] {
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch (cause) {
    throw new Error(`Could not read offers at "${path}". Pass --offers or set OFFERS_PATH.`, {
      cause,
    });
  }

  const parsed = JSON.parse(raw) as Offer[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`"${path}" contained no offers.`);
  }
  return parsed;
}

/** Integer cents -> Dutch euro string, e.g. 279 -> "€2,79". */
function formatEuro(cents: number | null): string | null {
  if (cents === null) return null;
  return "€" + (cents / 100).toFixed(2).replace(".", ",");
}

/** The price line, or the raw label when the chain never published a price. */
function priceLabel(offer: Offer): string {
  const now = formatEuro(offer.pricing.currentPriceCents);
  const was = formatEuro(offer.pricing.originalPriceCents);
  if (now && was) return `${now} (was ${was})`;
  if (now) return now;
  return offer.rawLabel ?? "actieprijs in de winkel";
}

function offerUrl(offer: Offer): string {
  return `${SITE_URL}/aanbieding/${offer.source}-${offer.sourceOfferId}`;
}

function renderMarkdown(picks: WeeklyPick[], week: number): string {
  const stores = new Set(picks.map((p) => p.offer.source)).size;

  const lines: string[] = [
    `## De ${picks.length} scherpste supermarktaanbiedingen van week ${week}`,
    "",
    `Verzameld over ${stores} ketens, gesorteerd op werkelijke korting per stuk. ` +
      `1+1 gratis is omgerekend naar 50%, "2e halve prijs" naar 25%, zodat de vormen vergelijkbaar zijn.`,
    "",
  ];

  picks.forEach((pick, i) => {
    const { offer } = pick;
    const category = CATEGORY_LABEL[categorizeOffer(offer)];
    lines.push(
      `${i + 1}. **${offer.title}** — ${supermarketName(offer.source)} · ` +
        `${priceLabel(offer)} · **-${pick.discountPercent}%** · ${category}  `,
      `   ${offerUrl(offer)}`,
    );
  });

  lines.push(
    "",
    "---",
    "",
    `Alle acties van deze week staan op ${SITE_URL} — tien ketens, doorzoekbaar, ` +
      `zonder account en zonder advertenties.`,
  );

  return lines.join("\n");
}

function renderSocial(picks: WeeklyPick[], week: number): string {
  // Deliberately short: a caption competes with the image, not with a blog post.
  const top = picks.slice(0, 5);

  const lines: string[] = [`De 5 scherpste acties van week ${week} 🛒`, ""];

  top.forEach((pick) => {
    lines.push(
      `-${pick.discountPercent}% · ${pick.offer.title} · ${supermarketName(pick.offer.source)} · ${priceLabel(pick.offer)}`,
    );
  });

  lines.push(
    "",
    `Alle aanbiedingen van 10 supermarkten op superscout.nl`,
    "Geen account, geen advertenties, geen tracking.",
    "",
    "#boodschappen #aanbiedingen #besparen #supermarkt #bespaartips #albertheijn #jumbo #lidl #aldi",
  );

  return lines.join("\n");
}

function renderJson(picks: WeeklyPick[], week: number): string {
  return JSON.stringify(
    {
      week,
      generatedAt: new Date().toISOString(),
      picks: picks.map((pick) => ({
        title: pick.offer.title,
        store: supermarketName(pick.offer.source),
        storeSlug: pick.offer.source,
        category: CATEGORY_LABEL[categorizeOffer(pick.offer)],
        discountPercent: pick.discountPercent,
        currentPriceCents: pick.offer.pricing.currentPriceCents,
        originalPriceCents: pick.offer.pricing.originalPriceCents,
        priceLabel: priceLabel(pick.offer),
        daysLeft: Number.isFinite(pick.daysLeft) ? pick.daysLeft : null,
        validUntil: pick.offer.validUntil || null,
        imageUrl: pick.offer.imageUrl ?? null,
        url: offerUrl(pick.offer),
      })),
    },
    null,
    2,
  );
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const offers = loadOffers(args.offersPath);
  const picks = weeklyPicks(offers, { nowIso: args.nowIso, limit: args.limit });

  if (picks.length === 0) {
    // Exit non-zero: a silent empty post is worse than a failed cron job.
    console.error(
      `No postable offers found in "${args.offersPath}". ` +
        `The data may be stale — every offer is expired or filtered out.`,
    );
    process.exit(1);
  }

  const week = isoWeekNumber(new Date(args.nowIso));

  switch (args.format) {
    case "markdown":
      console.log(renderMarkdown(picks, week));
      break;
    case "social":
      console.log(renderSocial(picks, week));
      break;
    case "json":
      console.log(renderJson(picks, week));
      break;
  }
}

main();
