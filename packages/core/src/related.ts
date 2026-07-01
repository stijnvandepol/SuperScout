import type { Offer } from "./offer";

export interface RelatedOffers {
  /** Same brand, any store. */
  sameBrand: Offer[];
  /** A similar product at a different store — the cross-store comparison. */
  alternatives: Offer[];
  /** Otherwise related (similar product, same store or already-covered brand). */
  related: Offer[];
}

/** Meaningful keywords from an offer's title + brand (words of 4+ chars). */
function keywords(offer: Offer): Set<string> {
  const words = `${offer.title} ${offer.brand ?? ""}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4);
  return new Set(words);
}

function overlaps(a: Set<string>, b: Set<string>): boolean {
  for (const word of a) if (b.has(word)) return true;
  return false;
}

/**
 * Group offers related to a target into mutually-exclusive buckets, by priority:
 * same brand → alternative at another store → otherwise related. Until EAN
 * matching lands, similarity is keyword overlap on title/brand.
 */
export function relatedOffers(target: Offer, all: Offer[]): RelatedOffers {
  const others = all.filter((o) => o.id !== target.id);
  const targetKeywords = keywords(target);
  const brand = target.brand?.trim().toLowerCase() || undefined;

  const sameBrand = brand
    ? others.filter((o) => (o.brand?.trim().toLowerCase() ?? "") === brand)
    : [];
  const sameBrandIds = new Set(sameBrand.map((o) => o.id));

  const similar = others.filter((o) => overlaps(keywords(o), targetKeywords));

  const alternatives = similar.filter(
    (o) => o.source !== target.source && !sameBrandIds.has(o.id),
  );
  const alternativeIds = new Set(alternatives.map((o) => o.id));

  const related = similar.filter(
    (o) => !sameBrandIds.has(o.id) && !alternativeIds.has(o.id),
  );

  return { sameBrand, alternatives, related };
}
