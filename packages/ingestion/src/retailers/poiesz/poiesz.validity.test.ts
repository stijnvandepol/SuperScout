import { describe, expect, test } from "vitest";
import { parsePoieszPeriod } from "./poiesz.validity";

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
