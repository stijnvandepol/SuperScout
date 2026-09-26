export { DirkAdapter, DIRK_DEPARTMENTS } from "./adapters/dirk/dirk.adapter";
export type { JsonFetcher } from "./adapters/dirk/dirk.adapter";
export { normalizeDirkOffer, DIRK_IMAGE_BASE } from "./adapters/dirk/dirk.normalize";
export type * from "./adapters/dirk/dirk.raw";

export { JumboAdapter } from "./adapters/jumbo/jumbo.adapter";
export type { JumboFetcher } from "./adapters/jumbo/jumbo.adapter";
export { normalizeJumboPromotion } from "./adapters/jumbo/jumbo.normalize";
export { parseJumboMechanism } from "./adapters/jumbo/jumbo.mechanism";
export type * from "./adapters/jumbo/jumbo.raw";

export { AhAdapter } from "./adapters/ah/ah.adapter";
export type { AhFetcher } from "./adapters/ah/ah.adapter";
export { normalizeAhPromotion } from "./adapters/ah/ah.normalize";
export { parseAhMechanism } from "./adapters/ah/ah.mechanism";
export type * from "./adapters/ah/ah.raw";

export { PlusAdapter } from "./adapters/plus/plus.adapter";
export type { PlusFetcher } from "./adapters/plus/plus.adapter";
export { normalizePlusOffer } from "./adapters/plus/plus.normalize";
export { parsePlusMechanism } from "./adapters/plus/plus.mechanism";
export type * from "./adapters/plus/plus.raw";

export { runIngestion } from "./runner";
export type { IngestionReport, SourceResult, RunOptions } from "./runner";

export { FeedFileAdapter, feedAdapters } from "./adapters/feed/feed.adapter";
export { normalizeFeed, MAX_FEED_AGE_DAYS, MAX_FEED_VALIDITY_DAYS } from "./adapters/feed/feed.normalize";
export type { FeedFile, FeedOffer, FeedResult } from "./adapters/feed/feed.normalize";
export { parsePromoLabel as parseFeedLabel } from "@superscout/core";
