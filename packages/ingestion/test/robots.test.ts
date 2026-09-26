import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { Offer, SourceAdapter } from "@superscout/core";
import { isAllowed, parseRobots, RobotsPolicy } from "../src/robots";
import { gateAdapters, isBlockError, stopOnRefusal } from "../src/gate";
import { SOURCE_URLS } from "../src/source-urls";

describe("robots.txt lezen (RFC 9309)", () => {
  const txt = `
# commentaar
User-agent: *
Disallow: /api/
Allow: /api/offers/public
Disallow: /*.json$

User-agent: SuperScoutBot
User-agent: anderebot
Disallow: /verboden-voor-ons
`;

  test("de groep met onze naam gaat voor de *-groep", () => {
    // Our own group does not mention /api/, so /api/ is allowed for us.
    expect(isAllowed(txt, "https://x.nl/api/offers/current/1")).toBe(true);
    expect(isAllowed(txt, "https://x.nl/verboden-voor-ons/pagina")).toBe(false);
  });

  test("zonder eigen groep geldt *, en de langste regel wint", () => {
    expect(isAllowed(txt, "https://x.nl/api/offers/current/1", "iemandanders")).toBe(false);
    expect(isAllowed(txt, "https://x.nl/api/offers/public/1", "iemandanders")).toBe(true);
    expect(isAllowed(txt, "https://x.nl/aanbiedingen", "iemandanders")).toBe(true);
  });

  test("* en $ werken als jokers", () => {
    expect(isAllowed(txt, "https://x.nl/data/prijzen.json", "iemandanders")).toBe(false);
    expect(isAllowed(txt, "https://x.nl/data/prijzen.json?x=1", "iemandanders")).toBe(true);
  });

  test("bij gelijke lengte wint Allow; een lege Disallow verbiedt niets", () => {
    expect(isAllowed("User-agent: *\nDisallow: /a\nAllow: /a", "https://x.nl/a")).toBe(true);
    expect(isAllowed("User-agent: *\nDisallow:", "https://x.nl/alles")).toBe(true);
  });

  test("alles verboden is alles verboden, behalve robots.txt zelf", () => {
    expect(isAllowed("User-agent: *\nDisallow: /", "https://x.nl/aanbiedingen")).toBe(false);
    expect(isAllowed("User-agent: *\nDisallow: /", "https://x.nl/robots.txt")).toBe(true);
  });

  test("een regel als 'User-agent: bot' is niet voor ons", () => {
    const groups = parseRobots("User-agent: bot\nDisallow: /");
    expect(groups).toHaveLength(1);
    expect(isAllowed("User-agent: bot\nDisallow: /", "https://x.nl/a")).toBe(true);
  });
});

describe("RobotsPolicy", () => {
  const url = "https://www.voorbeeld.nl/aanbiedingen";

  test("4xx betekent: geen robots.txt, dus toegestaan", async () => {
    const policy = new RobotsPolicy(async () => ({ status: 404, body: "" }));
    expect(await policy.check(url)).toBeNull();
  });

  test("onbereikbaar zonder kopie: niet ophalen", async () => {
    const policy = new RobotsPolicy(async () => {
      throw new Error("ECONNRESET");
    });
    expect(await policy.check(url)).toMatch(/onbereikbaar/);
  });

  test("onbereikbaar mét recente kopie: die kopie geldt", async () => {
    const now = Date.parse("2026-09-26T06:00:00Z");
    const policy = new RobotsPolicy(
      async () => ({ status: 503, body: "" }),
      { "https://www.voorbeeld.nl": { fetchedAt: "2026-09-20T06:00:00Z", status: 200, body: "User-agent: *\nDisallow: /aanbiedingen" } },
      () => now,
    );
    expect(await policy.check(url)).toMatch(/staat \/aanbiedingen niet toe/);
  });

  test("een origin wordt per run maar één keer opgevraagd", async () => {
    let calls = 0;
    const policy = new RobotsPolicy(async () => {
      calls += 1;
      return { status: 200, body: "User-agent: *\nAllow: /" };
    });
    await Promise.all([policy.check(url), policy.check(`${url}?p=2`), policy.check(url)]);
    expect(calls).toBe(1);
    expect(Object.keys(policy.snapshot())).toEqual(["https://www.voorbeeld.nl"]);
  });
});

describe("de poort voor adapters", () => {
  const adapter = (source: SourceAdapter["source"]): SourceAdapter => ({
    source,
    fetchOffers: async () => [] as Offer[],
  });
  const disallowAll = new RobotsPolicy(async () => ({ status: 200, body: "User-agent: *\nDisallow: /" }));
  const now = Date.parse("2026-09-26T06:00:00Z");

  test("verboden door robots.txt: niet ophalen, wel melden waarom", async () => {
    const { adapters } = await gateAdapters([adapter("dirk")], { robots: disallowAll, mode: "enforce", blockedSince: {}, now });
    await expect(adapters[0]!.fetchOffers()).rejects.toThrow(/robots.txt van www.dirk.nl/);
  });

  test("in rapportagemodus draait de adapter en staat het bezwaar in de waarschuwingen", async () => {
    const original = adapter("dirk");
    const { adapters, warnings } = await gateAdapters([original], { robots: disallowAll, mode: "report", blockedSince: {}, now });
    expect(adapters[0]).toBe(original);
    expect(warnings.dirk).toMatch(/niet toe/);
  });

  test("na een weigering zeven dagen niet aankloppen, daarna één keer", async () => {
    const allowAll = new RobotsPolicy(async () => ({ status: 404, body: "" }));
    const recent = await gateAdapters([adapter("jumbo")], {
      robots: allowAll,
      mode: "enforce",
      blockedSince: { jumbo: "2026-09-22T05:00:00Z" },
      now,
    });
    await expect(recent.adapters[0]!.fetchOffers()).rejects.toThrow(/volgende poging op 2026-09-29/);

    const old = await gateAdapters([adapter("jumbo")], {
      robots: allowAll,
      mode: "enforce",
      blockedSince: { jumbo: "2026-09-10T05:00:00Z" },
      now,
    });
    await expect(old.adapters[0]!.fetchOffers()).resolves.toEqual([]);
  });

  test("feeds hebben geen website en gaan altijd door", async () => {
    const feed = adapter("kruidvat");
    const { adapters } = await gateAdapters([feed], { robots: disallowAll, mode: "enforce", blockedSince: {}, now });
    expect(adapters[0]).toBe(feed);
  });
});

describe("weigeringen", () => {
  test("herkent 'nee' van een winkel, niet elke fout", () => {
    expect(isBlockError("Dirk responded 403 for https://…")).toBe(true);
    expect(isBlockError("AH graphql responded 429")).toBe(true);
    expect(isBlockError("captcha challenge")).toBe(true);
    expect(isBlockError("Source timed out after 60000ms")).toBe(false);
    expect(isBlockError("AH graphql responded 500")).toBe(false);
  });

  test("na de eerste weigering gaat er geen verzoek meer de deur uit", async () => {
    let requests = 0;
    const state = { refused: null as number | null };
    const guarded = stopOnRefusal(async () => {
      requests += 1;
      return new Response("", { status: 403 });
    }, state);
    await guarded("https://x.nl/1");
    await expect(guarded("https://x.nl/2")).rejects.toThrow(/403/);
    await expect(guarded("https://x.nl/3")).rejects.toThrow(/geen nieuwe verzoeken/);
    expect(requests).toBe(1);
  });
});

describe("volledigheid van de URL-lijst", () => {
  test("elke URL-constante in een adapter staat in source-urls.ts", () => {
    const listed = Object.values(SOURCE_URLS).flat().join("\n");
    const dir = join(__dirname, "..", "src", "adapters");
    const missing: string[] = [];
    for (const chain of readdirSync(dir)) {
      if (chain === "feed") continue;
      for (const file of readdirSync(join(dir, chain)).filter((f) => f.endsWith(".adapter.ts") || f.endsWith(".assortment.ts"))) {
        const source = readFileSync(join(dir, chain, file), "utf-8");
        for (const m of source.matchAll(/const \w+_URL\w* = "(https:\/\/[^"]+)"/g)) {
          const url = m[1]!;
          // Base URLs that get a suffix (Dirk's department number) count as listed when a listed URL starts with them.
          if (!listed.split("\n").some((l) => l.startsWith(url))) missing.push(`${chain}/${file}: ${url}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
