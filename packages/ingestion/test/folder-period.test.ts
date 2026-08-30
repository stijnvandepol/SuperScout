import { describe, expect, test } from "vitest";
import { parsePoieszPeriod } from "../src/adapters/poiesz/poiesz.validity";
import { parseSligroPeriod } from "../src/adapters/sligro/sligro.validity";

/**
 * Poiesz and Sligro publish one folder period for the whole page rather than a
 * date per offer. Both used to emit every offer with an empty validity, which
 * meant nothing could tell a running promotion from a finished one.
 */

describe("parsePoieszPeriod", () => {
  // Excerpted from webwinkel.poiesz-supermarkten.nl/aanbiedingen: a flattened
  // Nuxt payload where every offer points at the same two indices.
  const REAL =
    '"Feestdagen","feestdagen",{"offers":2180,"offersCmsPage":4496},' +
    '{"validFrom":2181,"validUntil":2182,"categories":2183},' +
    '"2026-08-30T00:00:00","2026-09-06T00:00:00",[2184,2424,2585]';

  test("the exclusive end date becomes the last day the offer actually runs", () => {
    // The payload says 09-06T00:00; the page says "tot en met 5 september".
    // Taking the field at face value would run every offer a day too long.
    expect(parsePoieszPeriod(REAL)).toEqual({
      validFrom: "2026-08-30T00:00:00.000Z",
      validUntil: "2026-09-05T23:59:00.000Z",
    });
  });

  test("a reshaped payload yields null rather than a wrong period", () => {
    expect(parsePoieszPeriod('{"validFrom":"2026-08-30"}')).toBeNull();
    expect(parsePoieszPeriod("<html>geen payload</html>")).toBeNull();
  });

  test("an end date at or before the start is rejected", () => {
    const bad =
      '{"validFrom":1,"validUntil":2,"categories":3},"2026-08-30T00:00:00","2026-08-30T00:00:00"';
    expect(parsePoieszPeriod(bad)).toBeNull();
  });
});

describe("parseSligroPeriod", () => {
  test("infers the opening month when the copy omits it", () => {
    // "Geldig van 13 t/m 31 augustus 2026" — the first month is left out
    // because the period stays inside one month.
    expect(parseSligroPeriod("Geldig van 13 t/m 31 augustus 2026")).toEqual({
      validFrom: "2026-08-13T00:00:00.000Z",
      validUntil: "2026-08-31T23:59:00.000Z",
    });
  });

  test("reads a period that crosses a month boundary", () => {
    expect(parseSligroPeriod("Geldig van 30 augustus t/m 5 september 2026")).toEqual({
      validFrom: "2026-08-30T00:00:00.000Z",
      validUntil: "2026-09-05T23:59:00.000Z",
    });
  });

  test("accepts the spelled-out variant", () => {
    expect(parseSligroPeriod("Geldig van 1 tot en met 7 juni 2026")).toEqual({
      validFrom: "2026-06-01T00:00:00.000Z",
      validUntil: "2026-06-07T23:59:00.000Z",
    });
  });

  test("handles a period running into the new year", () => {
    // An end month before the start month can only mean the year rolled over.
    expect(parseSligroPeriod("Geldig van 28 december t/m 3 januari 2026")).toEqual({
      validFrom: "2025-12-28T00:00:00.000Z",
      validUntil: "2026-01-03T23:59:00.000Z",
    });
  });

  test("tolerates the whitespace a page's innerText brings along", () => {
    expect(parseSligroPeriod("\n  Geldig  van  13   t/m\n31 augustus 2026\n")).not.toBeNull();
  });

  test("rejects an impossible date instead of shifting it", () => {
    // Date would silently roll 31 februari into 3 March.
    expect(parseSligroPeriod("Geldig van 1 t/m 31 februari 2026")).toBeNull();
  });

  test("copy we do not recognise yields null, never a guess", () => {
    expect(parseSligroPeriod("Deze week scherp geprijsd")).toBeNull();
    expect(parseSligroPeriod("Geldig van 13 t/m 31 smurfmaand 2026")).toBeNull();
  });
});
