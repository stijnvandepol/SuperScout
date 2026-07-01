export { DirkAdapter, DIRK_DEPARTMENTS } from "./adapters/dirk/dirk.adapter";
export type { JsonFetcher } from "./adapters/dirk/dirk.adapter";
export { normalizeDirkOffer, DIRK_IMAGE_BASE } from "./adapters/dirk/dirk.normalize";
export type * from "./adapters/dirk/dirk.raw";

export { JumboAdapter } from "./adapters/jumbo/jumbo.adapter";
export type { JumboFetcher } from "./adapters/jumbo/jumbo.adapter";
export { normalizeJumboPromotion } from "./adapters/jumbo/jumbo.normalize";
export { parseJumboMechanism } from "./adapters/jumbo/jumbo.mechanism";
export type * from "./adapters/jumbo/jumbo.raw";
