import type { FeedRule, FeedTier } from "@/lib/feed/config";

/*
 * Shapes shared by the feed's pure modules (Sweep C). Dates are epoch
 * milliseconds so the cached pool survives JSON round trips unchanged.
 */

/** One eligible series with its card fields and its SeriesStats row. */
export type PoolSeries = {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  themeColor: string | null;
  /** Lowercase genre. */
  genre: string;
  /** Sub tags on the fixed list, canonical spelling. */
  tags: string[];
  authorId: string;
  authorName: string | null;
  isComplete: boolean;
  completedAt: number | null;
  episodeCount: number;
  totalReadMinutes: number;
  firstPublishedAt: number | null;
  lastPublishedAt: number | null;
  createdAt: number;
  ratingCount: number;
  ratingSum: number;
  bookmarkCount: number;
  followCount: number;
  readsTotal: number;
  reads7d: number;
  completions7d: number;
  newBookmarks7d: number;
  newFollows7d: number;
  newRatings7d: number;
  /** CONTENT RATING HOOK: always false in Phase 1 (no mature content). */
  isMature: boolean;
};

/** Per-writer facts for the New Writers shelf. */
export type PoolWriter = {
  authorId: string;
  publishedEpisodes: number;
  firstPublishedAt: number | null;
  /** Times shown on New Writers in the last EXPOSURE_WINDOW_DAYS. */
  exposure7d: number;
};

export type ShelfConfig = {
  id: string;
  key: string;
  name: string;
  tier: FeedTier;
  rule: FeedRule;
  genres: string[];
  tags: string[];
  weight: number;
  minItems: number;
  maxItems: number;
  enabled: boolean;
  sortOrder: number;
  builtIn: boolean;
  months: number[];
  /** STAFF_PICKS: series ids in order. */
  items: string[];
};

export type FeedPool = {
  series: PoolSeries[];
  writers: PoolWriter[];
  shelves: ShelfConfig[];
  builtAt: number;
  statsComputedAt: number | null;
};

/** What the feed knows about the reader (lib/feed/server.ts loads it in one query). */
export type ReaderSignals = {
  readerId: string;
  ratings: { seriesId: string; value: number; at: number }[];
  bookmarks: { seriesId: string; at: number }[];
  follows: { seriesId: string; at: number }[];
  /** One row per finished episode. */
  finished: { seriesId: string; at: number }[];
  /** Per series: the most recently read episode, and the series' last published episode number. */
  progress: { seriesId: string; episodeNumber: number; percent: number; at: number; lastEpisodeNumber: number }[];
  followedAuthors: string[];
  /** Genre and tags of every series above (ineligible ones too, so taste still counts them). */
  seriesMeta: Record<string, { genre: string; tags: string[]; title: string }>;
};

export type FeedCard = {
  id: string;
  title: string;
  coverImage: string | null;
  genre: string;
  themeColor: string | null;
  authorName: string | null;
};

export type ComposedShelf = {
  key: string;
  rule: FeedRule;
  title: string;
  cards: FeedCard[];
};
