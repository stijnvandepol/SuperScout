import type { RetailerModule } from "./module";
import ah from "./ah";
import aldi from "./aldi";
import dekamarkt from "./dekamarkt";
import dirk from "./dirk";
import hoogvliet from "./hoogvliet";
import jumbo from "./jumbo";
import lidl from "./lidl";
import plus from "./plus";
import poiesz from "./poiesz";
import sligro from "./sligro";

/**
 * Every retailer the worker fetches, one line each.
 *
 * The only list in the ingestion package that names chains. Adding a
 * supermarket: create `retailers/<slug>/` (see README.md) and add it here.
 * Explicit imports rather than a directory scan, because the worker is bundled
 * with esbuild and a scan would silently miss a module the bundle left out.
 */
export const RETAILER_MODULES: readonly RetailerModule[] = [
  ah,
  aldi,
  dekamarkt,
  dirk,
  hoogvliet,
  jumbo,
  lidl,
  plus,
  poiesz,
  sligro,
];

export function moduleFor(source: string): RetailerModule | undefined {
  return RETAILER_MODULES.find((m) => m.source === source);
}

export type { RetailerModule } from "./module";
export { defineRetailer, withBrowser } from "./module";
