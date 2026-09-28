import { expect, test } from "vitest";
import fixture from "./fixtures/plus-promotions.json" with { type: "json" };
import plus, { isPlusPromotionList } from ".";

test("de promotielijst wordt op vorm herkend, niet op de naam van de endpoint", () => {
  expect(isPlusPromotionList("https://www.plus.nl/screenservices/NieuweNaam/DataActionX", fixture)).toBe(true);
  expect(isPlusPromotionList("https://www.plus.nl/x", { data: { Iets: [] } })).toBe(false);
  expect(isPlusPromotionList("https://www.plus.nl/x", null)).toBe(false);
});

test("zonder browser meldt PLUS zich als mislukt in plaats van te verdwijnen", async () => {
  const adapter = plus.create({ browser: null });
  expect(adapter.source).toBe("plus");
  await expect(adapter.fetchOffers()).rejects.toThrow(/browser startte niet/);
});
