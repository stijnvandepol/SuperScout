import { describe, expect, test } from "vitest";
import { HONEST_USER_AGENT, HostThrottle, politeFetch } from "./polite";

describe("beleefd ophalen", () => {
  test("per site minstens het interval tussen twee verzoeken, andere sites wachten niet", async () => {
    let clock = 0;
    const slept: number[] = [];
    const throttle = new HostThrottle(3000, () => clock, async (ms) => {
      slept.push(ms);
      clock += ms;
    });
    await throttle.wait("www.dirk.nl");
    await throttle.wait("www.dirk.nl");
    await throttle.wait("www.jumbo.com");
    await throttle.wait("www.dirk.nl");
    expect(slept).toEqual([3000, 3000]);
  });

  test("gelijktijdige verzoeken naar één site schuiven netjes achter elkaar", async () => {
    let clock = 0;
    const slept: number[] = [];
    const throttle = new HostThrottle(3000, () => clock, async (ms) => {
      slept.push(ms);
    });
    await Promise.all([throttle.wait("a.nl"), throttle.wait("a.nl"), throttle.wait("a.nl")]);
    expect(slept).toEqual([3000, 6000]);
  });

  test("elke request draagt onze eigen naam, ook als een adapter iets anders zet", async () => {
    const seen: string[] = [];
    const fetcher = politeFetch(new HostThrottle(0), async (_url, init) => {
      seen.push(new Headers(init?.headers).get("user-agent") ?? "");
      return new Response("{}");
    });
    await fetcher("https://www.jumbo.com/api/graphql", { headers: { "user-agent": "Appie/9.39" } });
    expect(seen).toEqual([HONEST_USER_AGENT]);
    expect(HONEST_USER_AGENT).toMatch(/SuperScoutBot\/1\.0; \+https:\/\/superscout\.nl\/ethiek/);
  });
});
