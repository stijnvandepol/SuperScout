import { describe, expect, test } from "vitest";
import { parseAldiValidity, toIsoRange } from "../src/adapters/aldi/aldi.validity";

/**
 * Fixture excerpted verbatim from aldi.nl/aanbiedingen.html — quotes arrive
 * backslash-escaped because the blob is JSON embedded in JSON, and the field
 * order varies: sometimes `objectID` follows the dates immediately, sometimes
 * `categoryIDs` and `assets` sit between.
 */
const REAL = String.raw`
{\"1200245\":{\"isAvailable\":true,\"promotionPrices\":[{\"validFrom\":1787868000,\"validUntil\":1788127199,\"priceValue\":3.99,\"basePrice\":[{\"basePriceValue\":19.88,\"basePriceScale\":\"kg\"}],\"priceTagLabels\":{\"promoText1\":\"-20%\"},\"validFromLocalDate\":\"2026-08-28\",\"validUntilLocalDate\":\"2026-08-30\"}],\"objectID\":\"1200245\"},
\"1200809\":{\"isAvailable\":true,\"promotionPrices\":[{\"validFrom\":1787522400,\"validUntil\":1788127199,\"priceValue\":4.99,\"priceTagLabels\":{\"promoText1\":\"OP=OP\"},\"validFromLocalDate\":\"2026-08-24\",\"validUntilLocalDate\":\"2026-08-30\"}],\"objectID\":\"1200809\"},
\"1228668\":{\"isAvailable\":true,\"promotionPrices\":[{\"validFrom\":1787695200,\"validUntil\":1788299999,\"priceValue\":2.99,\"priceTagLabels\":{\"promoText1\":\"OP=OP\"},\"validFromLocalDate\":\"2026-08-26\",\"validUntilLocalDate\":\"2026-09-01\"}],\"categoryIDs\":[\"offer\"],\"assets\":[{\"type\":\"gallery\"}],\"objectID\":\"1228668\"}}
`;

describe("parseAldiValidity", () => {
  test("reads the promotion period for every product in the blob", () => {
    const map = parseAldiValidity(REAL);

    expect(map.size).toBe(3);
    expect(map.get("1200809")).toEqual({ validFrom: "2026-08-24", validUntil: "2026-08-30" });
    expect(map.get("1200245")).toEqual({ validFrom: "2026-08-28", validUntil: "2026-08-30" });
  });

  test("survives other fields sitting between the dates and the objectID", () => {
    // 1228668 carries categoryIDs and assets in between; a pattern that
    // required them to be adjacent would silently drop it.
    expect(parseAldiValidity(REAL).get("1228668")).toEqual({
      validFrom: "2026-08-26",
      validUntil: "2026-09-01",
    });
  });

  test("a product without its own dates gets none, not its neighbour's", () => {
    const html = String.raw`\"validFromLocalDate\":\"2026-08-24\",\"validUntilLocalDate\":\"2026-08-30\"}],\"objectID\":\"111\"},\"222\":{\"isAvailable\":true,\"objectID\":\"222\"}`;
    const map = parseAldiValidity(html);

    expect(map.get("111")).toBeDefined();
    // Borrowing a date would be worse than having none: it would claim a
    // validity period the chain never published for this product.
    expect(map.has("222")).toBe(false);
  });

  test("works on unescaped JSON too, so the shape is not the contract", () => {
    const plain = '"validFromLocalDate":"2026-09-07","validUntilLocalDate":"2026-09-13"}],"objectID":"9"';
    expect(parseAldiValidity(plain).get("9")).toEqual({
      validFrom: "2026-09-07",
      validUntil: "2026-09-13",
    });
  });

  test("a page without the blob yields an empty map rather than throwing", () => {
    expect(parseAldiValidity("<html><body>niets</body></html>").size).toBe(0);
  });

  test("repeats later in the page do not overwrite the offer listing", () => {
    const html = String.raw`\"validFromLocalDate\":\"2026-08-24\",\"validUntilLocalDate\":\"2026-08-30\"}],\"objectID\":\"5\"} ... \"validFromLocalDate\":\"2020-01-01\",\"validUntilLocalDate\":\"2020-01-02\"}],\"objectID\":\"5\"}`;
    expect(parseAldiValidity(html).get("5")).toEqual({
      validFrom: "2026-08-24",
      validUntil: "2026-08-30",
    });
  });
});

describe("toIsoRange", () => {
  test("spans the whole end day, matching how the API chains publish", () => {
    expect(toIsoRange({ validFrom: "2026-08-24", validUntil: "2026-08-30" })).toEqual({
      validFrom: "2026-08-24T00:00:00.000Z",
      validUntil: "2026-08-30T23:59:00.000Z",
    });
  });
});
