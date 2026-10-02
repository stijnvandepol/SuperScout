import { describe, expect, test, vi } from "vitest";
import type { Offer } from "@superscout/core";
import { changedUrls, submitIndexNow } from "./indexnow";

const SITE = "https://superscout.nl";

function offer(source: string, id: string, title: string): Offer {
  return {
    id: `${source}:${id}`,
    source,
    sourceOfferId: id,
    title,
    pricing: { currentPriceCents: 199, originalPriceCents: null, savingsAbsoluteCents: null, savingsPercent: null },
    mechanism: { type: "price_drop" },
    validFrom: "",
    validUntil: "",
    flags: {},
    fetchedAt: "2026-10-01T05:00:00.000Z",
  } as Offer;
}

const options = { site: SITE, catalogueChains: new Set(["ah", "jumbo"]) };

describe("changedUrls", () => {
  test("an unchanged set submits nothing — the endpoint should only hear about changes", () => {
    const same = [offer("dirk", "1", "Ventilator")];
    expect(changedUrls(same, same, options)).toEqual([]);
  });

  test("a new promotion brings its offer page, price page and the listings it appears on", () => {
    const urls = changedUrls([], [offer("dirk", "150000", "Ventilator")], options);
    expect(urls).toEqual(
      expect.arrayContaining([
        `${SITE}/`,
        `${SITE}/beste-aanbiedingen`,
        `${SITE}/winkel/dirk`,
        `${SITE}/aanbieding/dirk-150000`,
        `${SITE}/prijs/dirk/ventilator`,
      ]),
    );
  });

  test("an ended promotion is a change too: its URL now redirects", () => {
    const urls = changedUrls([offer("aldi", "9", "Drone")], [], options);
    expect(urls).toContain(`${SITE}/aanbieding/aldi-9`);
    expect(urls).toContain(`${SITE}/prijs/aldi/drone`);
  });

  test("catalogue chains skip the price page, which only redirects", () => {
    const urls = changedUrls([], [offer("jumbo", "3", "Coca-Cola")], options);
    expect(urls).toContain(`${SITE}/aanbieding/jumbo-3`);
    expect(urls.some((u) => u.includes("/prijs/"))).toBe(false);
  });

  test("never more than the protocol's 10.000 per submission", () => {
    const many = Array.from({ length: 6_000 }, (_, i) => offer("dirk", String(i), `Product ${i}`));
    expect(changedUrls([], many, options).length).toBe(10_000);
  });
});

describe("submitIndexNow", () => {
  test("posts host, key and key location as the protocol requires", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 202 }));
    const status = await submitIndexNow([`${SITE}/`], { key: "abc123", site: SITE, fetchImpl });

    expect(status).toBe(202);
    const body = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toEqual({
      host: "superscout.nl",
      key: "abc123",
      keyLocation: `${SITE}/indexnow.txt`,
      urlList: [`${SITE}/`],
    });
  });

  test("an empty list makes no request at all", async () => {
    const fetchImpl = vi.fn();
    expect(await submitIndexNow([], { key: "k", site: SITE, fetchImpl })).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
