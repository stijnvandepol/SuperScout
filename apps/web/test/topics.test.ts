import { describe, expect, test } from "vitest";
import { CATEGORIES } from "@superscout/core";
import { inTopic, isIndexableTopic, TOPICS, topicBySlug } from "@/lib/topics";

const topic = (slug: string) => topicBySlug(slug)!;
const o = (title: string, brand?: string) => ({ title, ...(brand ? { brand } : {}) });

describe("onderwerpen", () => {
  test("slugs zijn uniek en URL-veilig, categorieën bestaan", () => {
    const slugs = TOPICS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const t of TOPICS) {
      expect(t.slug).toMatch(/^[a-z0-9-]+$/);
      expect(CATEGORIES.some((c) => c.slug === t.category), t.slug).toBe(true);
      expect(t.tip.length, t.slug).toBeGreaterThan(80);
    }
  });

  // Every case is a false positive the first version produced on real data.
  test.each([
    ["tandpasta", "pasta", "Prodent tandpasta"],
    ["bierworst", "bier", "Gelderse bierworst"],
    ["ijslolly van merk SUN", "vaatwastabletten", "IJslolly's", "SUN LOLLY"],
    ["toiletblokken van Witte Reus", "wasmiddel", "Alle Witte Reus toiletblokken"],
    ["boterhampasta", "pasta", "Boterhampasta"],
    ["appeltaart", "boter", "AH Roomboter-appeltaart"],
    ["radler rosé", "wijn", "Amstel Radler Rosé"],
    ["Hertog Jan", "ijs", "Hertog Jan"],
    ["een bezorgactie", "chips", "Doritos, Lays en Cheetos: gratis bezorging bij 12 euro"],
  ])("%s valt niet onder %s", (_why, slug, title, brand) => {
    expect(inTopic(o(title, brand), topic(slug))).toBe(false);
  });

  test.each([
    ["koffie", "L'OR of Douwe Egberts Excellent koffiebonen"],
    ["wasmiddel", "Ariel vloeibaar wasmiddel"],
    ["luiers", "Pampers Baby Dry Pants"],
    ["pasta", "Alle Rummo pasta"],
    ["kip", "Wahid kipfilet"],
    ["vaatwastabletten", "Alle Sun en Finish"],
    ["chocolade", "Alle Tony's Chocolonely repen"],
  ])("%s herkent %s", (slug, title) => {
    expect(inTopic(o(title), topic(slug))).toBe(true);
  });

  test("een pagina wordt pas indexeerbaar met genoeg aanbod bij meer dan één winkel", () => {
    const six = (source: string) => Array.from({ length: 6 }, () => ({ source }));
    expect(isIndexableTopic(six("ah"))).toBe(false);
    expect(isIndexableTopic([...six("ah").slice(0, 5), { source: "jumbo" }])).toBe(true);
    expect(isIndexableTopic([{ source: "ah" }, { source: "jumbo" }])).toBe(false);
  });
});
