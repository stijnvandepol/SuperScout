import { expect, test } from "vitest";
import { offerListHints } from "./capture-hints";

test("wijst een lijst met prijs en naam aan, niet de rest", () => {
  const items = Array.from({ length: 6 }, (_, i) => ({ id: i, title: `Product ${i}`, price: 1.99 }));
  const hints = offerListHints({ meta: { page: 1 }, data: { promotions: items, tags: ["a", "b", "c", "d", "e"] } });
  expect(hints).toHaveLength(1);
  expect(hints[0]).toMatch(/^\$\.data\.promotions \(6 items: id, title, price\)/);
});
