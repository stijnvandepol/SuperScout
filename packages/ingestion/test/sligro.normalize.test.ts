import { describe, expect, test } from "vitest";
import { normalizeSligroOffer } from "../src/adapters/sligro/sligro.normalize";
import type { SligroRawOffer } from "../src/adapters/sligro/sligro.raw";

const FETCHED = "2026-07-06T09:00:00.000Z";

function raw(over: Partial<SligroRawOffer> = {}): SligroRawOffer {
  return {
    id: "71742",
    title: "Douwe Egberts Koffiebonen Espresso",
    unit: "Stazak 1 kg",
    currentPrice: "20,99",
    oldPrice: "27,99",
    url: "/p.71742.html/douwe-egberts",
    ...over,
  };
}

describe("normalizeSligroOffer", () => {
  test("maps current + old price to a price_drop (ex-VAT)", () => {
    const o = normalizeSligroOffer(raw(), FETCHED);
    expect(o.id).toBe("sligro:71742");
    expect(o.source).toBe("sligro");
    expect(o.pricing.currentPriceCents).toBe(2099);
    expect(o.pricing.originalPriceCents).toBe(2799);
    expect(o.pricing.savingsAbsoluteCents).toBe(700);
    expect(o.mechanism).toEqual({ type: "price_drop" });
    expect(o.rawLabel).toBe("Stazak 1 kg");
    expect(o.url).toBe("https://www.sligro.nl/p.71742.html/douwe-egberts");
  });

  test("is unknown without an old price", () => {
    const o = normalizeSligroOffer(raw({ oldPrice: undefined }), FETCHED);
    expect(o.pricing.currentPriceCents).toBe(2099);
    expect(o.pricing.originalPriceCents).toBeNull();
    expect(o.mechanism).toEqual({ type: "unknown" });
  });

  test("upgrades the blurry 'small' image to the sharp 'medium' rendition", () => {
    const img = "https://www.sligro.nl/image-service/_jcr_content.product.087.image/1/small.png";
    const o = normalizeSligroOffer(raw({ image: img }), FETCHED);
    expect(o.imageUrl).toBe(
      "https://www.sligro.nl/image-service/_jcr_content.product.087.image/1/medium.png",
    );
  });
});
