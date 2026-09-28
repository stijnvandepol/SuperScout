export { DirkAdapter, DIRK_DEPARTMENTS } from "./retailers/dirk/dirk.adapter";
export type { JsonFetcher } from "./retailers/dirk/dirk.adapter";
export { normalizeDirkOffer, DIRK_IMAGE_BASE } from "./retailers/dirk/dirk.normalize";
export type * from "./retailers/dirk/dirk.raw";

export { JumboAdapter } from "./retailers/jumbo/jumbo.adapter";
export type { JumboFetcher } from "./retailers/jumbo/jumbo.adapter";
export { normalizeJumboPromotion } from "./retailers/jumbo/jumbo.normalize";
export { parseJumboMechanism } from "./retailers/jumbo/jumbo.mechanism";
export type * from "./retailers/jumbo/jumbo.raw";

export { AhAdapter } from "./retailers/ah/ah.adapter";
export type { AhFetcher } from "./retailers/ah/ah.adapter";
export { normalizeAhPromotion } from "./retailers/ah/ah.normalize";
export { parseAhMechanism } from "./retailers/ah/ah.mechanism";
export type * from "./retailers/ah/ah.raw";

export { PlusAdapter } from "./retailers/plus/plus.adapter";
export type { PlusFetcher } from "./retailers/plus/plus.adapter";
export { normalizePlusOffer } from "./retailers/plus/plus.normalize";
export { parsePlusMechanism } from "./retailers/plus/plus.mechanism";
export type * from "./retailers/plus/plus.raw";

export { runIngestion } from "./runner";
export type { IngestionReport, SourceResult, RunOptions } from "./runner";

export { FeedFileAdapter, feedAdapters } from "./feed/feed.adapter";
export { normalizeFeed, MAX_FEED_AGE_DAYS, MAX_FEED_VALIDITY_DAYS } from "./feed/feed.normalize";
export type { FeedFile, FeedOffer, FeedResult } from "./feed/feed.normalize";
export { parsePromoLabel as parseFeedLabel } from "@superscout/core";
