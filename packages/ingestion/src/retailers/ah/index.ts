import { crawlAhAssortment } from "../../assortment-runner";
import { defineRetailer } from "../module";
import { AhAdapter } from "./ah.adapter";

/**
 * Albert Heijn: the GraphQL API behind the AH app. Its robots.txt disallows the
 * token endpoint for crawlers, so the gate currently skips this module — kept
 * so it comes back by itself if that ever changes, or if AH grants access.
 */
export default defineRetailer({
  source: "ah",
  urls: ["https://api.ah.nl/mobile-auth/v1/auth/token/anonymous", "https://api.ah.nl/graphql"],
  needs: "http",
  create: () => new AhAdapter(),
  catalogue: crawlAhAssortment,
});
