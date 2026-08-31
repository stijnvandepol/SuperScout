import { describe, expect, test } from "vitest";
import {
  normaliseTitle,
  parseDekamarktValidity,
} from "../src/adapters/dekamarkt/dekamarkt.validity";

/**
 * DekaMarkt hides its promotion dates in a devalue-encoded Nuxt payload: a flat
 * array where an object's field values are indices into that same array.
 *
 * The fixture mirrors the live page — index 0 is the root, the offer objects sit
 * further along, and their strings are looked up by index.
 */
function payload(entries: unknown[]): string {
  return `<script type="application/json" id="__NUXT_DATA__">${JSON.stringify(entries)}</script>`;
}

// 0:root 1:offer 2:title 3:start 4:end(exclusive) 5:second offer 6:its title
const REAL = payload([
  { data: 1 },
  { headerText: 2, startDate: 3, endDate: 4, offerPrice: 7 },
  "Hollandse Aardappelen",
  "2026-08-25T00:00:00.000Z",
  "2026-09-01T00:00:00.000Z",
  { headerText: 6, startDate: 3, endDate: 4 },
  "Hak",
  1.9,
]);

describe("parseDekamarktValidity", () => {
  test("resolves the index-referenced fields into a period", () => {
    const v = parseDekamarktValidity(REAL);
    expect(v.byTitle.get("hollandse aardappelen")).toEqual({
      validFrom: "2026-08-25T00:00:00.000Z",
      validUntil: "2026-08-31T23:59:00.000Z",
    });
  });

  test("the exclusive end date becomes the last day the offer runs", () => {
    // The payload says 09-01T00:00; disclaimerEndDate on the live page says
    // 08-31, and all 95 offers agreed. Taking endDate at face value would run
    // every DekaMarkt offer a day long.
    expect(parseDekamarktValidity(REAL).common?.validUntil).toBe("2026-08-31T23:59:00.000Z");
  });

  test("one period across the payload is exposed as the folder-wide fallback", () => {
    expect(parseDekamarktValidity(REAL).common).toEqual({
      validFrom: "2026-08-25T00:00:00.000Z",
      validUntil: "2026-08-31T23:59:00.000Z",
    });
  });

  test("mixed periods leave no fallback, so nothing is applied blindly", () => {
    const mixed = payload([
      { data: 1 },
      { headerText: 2, startDate: 3, endDate: 4 },
      "Aardappelen",
      "2026-08-25T00:00:00.000Z",
      "2026-09-01T00:00:00.000Z",
      { headerText: 6, startDate: 7, endDate: 8 },
      "Hak",
      "2026-09-01T00:00:00.000Z",
      "2026-09-08T00:00:00.000Z",
    ]);
    const v = parseDekamarktValidity(mixed);

    expect(v.common).toBeNull();
    // Each still joins on its own title.
    expect(v.byTitle.get("hak")?.validFrom).toBe("2026-09-01T00:00:00.000Z");
  });

  test("a title carrying two different periods is dropped rather than guessed", () => {
    // 88 of 95 live titles were unique; a repeat under a different period
    // cannot be joined safely, and picking one would be a coin flip.
    const clash = payload([
      { data: 1 },
      { headerText: 2, startDate: 3, endDate: 4 },
      "Hak",
      "2026-08-25T00:00:00.000Z",
      "2026-09-01T00:00:00.000Z",
      { headerText: 2, startDate: 6, endDate: 7 },
      "2026-09-01T00:00:00.000Z",
      "2026-09-08T00:00:00.000Z",
    ]);
    expect(parseDekamarktValidity(clash).byTitle.has("hak")).toBe(false);
  });

  test("a repeated title with the same period still joins", () => {
    const same = payload([
      { data: 1 },
      { headerText: 2, startDate: 3, endDate: 4 },
      "Hak",
      "2026-08-25T00:00:00.000Z",
      "2026-09-01T00:00:00.000Z",
      { headerText: 2, startDate: 3, endDate: 4 },
    ]);
    expect(parseDekamarktValidity(same).byTitle.get("hak")).toBeDefined();
  });

  test("a page without the payload yields nothing rather than throwing", () => {
    const empty = parseDekamarktValidity("<html><body>geen payload</body></html>");
    expect(empty.byTitle.size).toBe(0);
    expect(empty.common).toBeNull();
  });

  test("malformed payload JSON is survivable", () => {
    const broken = '<script type="application/json" id="__NUXT_DATA__">[{oeps</script>';
    expect(parseDekamarktValidity(broken).byTitle.size).toBe(0);
  });

  test("an end date at or before the start is rejected", () => {
    const bad = payload([
      { data: 1 },
      { headerText: 2, startDate: 3, endDate: 3 },
      "Hak",
      "2026-08-25T00:00:00.000Z",
    ]);
    expect(parseDekamarktValidity(bad).byTitle.size).toBe(0);
  });
});

describe("normaliseTitle", () => {
  test("matches the card and the payload despite case and spacing", () => {
    expect(normaliseTitle("  Hollandse   Aardappelen ")).toBe("hollandse aardappelen");
  });
});
