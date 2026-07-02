import type { Browser } from "playwright";
import type { SourceAdapter } from "@superscout/core";
import { PlusAdapter } from "../adapters/plus/plus.adapter";
import type { PlusPromotionListResponse } from "../adapters/plus/plus.raw";
import { LidlAdapter } from "../adapters/lidl/lidl.adapter";
import { AldiAdapter } from "../adapters/aldi/aldi.adapter";
import { HoogvlietAdapter } from "../adapters/hoogvliet/hoogvliet.adapter";
import { interceptJson } from "./intercept";

/**
 * Chains whose website loads offers client-side / behind bot-protection. We
 * drive the real offers page in a headless browser and intercept the chain's
 * own offers API response, then reuse that chain's normalizer.
 */
export function browserSources(browser: Browser): SourceAdapter[] {
  return [
    // Plus (OutSystems + Imperva): intercept the promotion-list screenservice.
    new PlusAdapter(() =>
      interceptJson<PlusPromotionListResponse>(
        browser,
        "https://www.plus.nl/aanbiedingen",
        "DataActionGetPromotionList_Optimization",
      ),
    ),
    // Lidl: server-rendered offers page, scraped from the DOM.
    new LidlAdapter(browser),
    // Aldi: server-rendered offers page, scraped from the DOM.
    new AldiAdapter(browser),
    // Hoogvliet: Intershop aanbiedingen catalog, scraped from the DOM.
    new HoogvlietAdapter(browser),
  ];
}
