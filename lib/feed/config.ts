/*
 * Feed tuning (Sweep C): every weight and threshold the feed uses, in one
 * place. Client-safe and pure. Per-shelf settings (name, weight, min/max
 * items, on/off, order, season) live in the FeedShelf table and are edited in
 * Administration > Feed; everything here is changed in code and reviewed.
 */

// ------------------------------------------------------------------ shelves

/** What a shelf shows. Admins can add TAGS shelves; the others are built in. */
export const FEED_RULES = [
  "NEW_WRITERS",
  "CONTINUE_READING",
  "BECAUSE_YOU_LIKED",
  "TRENDING",
  "JUST_UPDATED",
  "TRENDING_TOP_GENRE",
  "TOP_RATED",
  "COMPLETED",
  "TRENDING_GENRE",
  "HIDDEN_GEMS",
  "QUICK_READS",
  "WEEKEND_BINGES",
  "FRESH_FINISHES",
  "FOLLOWED_WRITERS",
  "STAFF_PICKS",
  "TAGS",
] as const;
export type FeedRule = (typeof FEED_RULES)[number];

export const FEED_TIERS = ["BIG", "GENRE", "NICHE"] as const;
export type FeedTier = (typeof FEED_TIERS)[number];

/** Shelves built from the reader's own history: never shown without real data behind them. */
export const PERSONAL_RULES: readonly FeedRule[] = ["CONTINUE_READING", "BECAUSE_YOU_LIKED", "TRENDING_TOP_GENRE", "FOLLOWED_WRITERS"];
/** Personal shelves that go first in the feed when they exist, in this order. */
export const LEADING_RULES: readonly FeedRule[] = ["CONTINUE_READING", "BECAUSE_YOU_LIKED"];
/** A reader with no taste profile gets these (cold start), plus Continue Reading if they have progress. */
export const COLD_START_RULES: readonly FeedRule[] = ["NEW_WRITERS", "TRENDING", "JUST_UPDATED"];

/**
 * Default shelf size: hidden below the minimum, cut at the maximum. Sweep D
 * lowered the minimum from 4 so more rows fill while the catalogue is small
 * (scripts/feed-min-items.ts moved the built-in shelves still at 4).
 */
export const DEFAULT_MIN_ITEMS = 3;
export const DEFAULT_MAX_ITEMS = 12;
/** Upper bounds an admin can set. */
export const MAX_SHELF_ITEMS = 24;
export const MAX_SHELF_WEIGHT = 100;
/** Staff Picks can hold this many series. */
export const MAX_STAFF_PICKS = 20;
/** At most this many cards by one writer on any shelf. */
export const MAX_PER_AUTHOR_PER_SHELF = 1;

// ------------------------------------------------------------------ composer

/** Shelves in the first load (sent with the page) and in each "More shelves". */
export const FEED_FIRST_LOAD = 7;
export const FEED_LOAD_MORE = 4;
/** No feed has more shelves than this. */
export const FEED_MAX_SHELVES = 20;
/** Share of reader-days whose feed includes New Writers (for readers with a taste profile; cold feeds always have it). */
export const NEW_WRITERS_SHOW_RATE = 0.75;
/** When New Writers is in the feed it is placed within the first this-many shelves. */
export const NEW_WRITERS_MAX_POSITION = 4;
/**
 * CONTENT RATING HOOK: when mature content exists (not in Phase 1), at most
 * this share of the cards on one screen may be mature. Nothing is mature
 * today (PoolSeries.isMature is always false), so the cap never applies.
 */
export const MATURE_FEED_CAP = 0.25;

// ------------------------------------------------------------------ Trending

/** Activity counts from the last this-many days. */
export const TRENDING_WINDOW_DAYS = 7;
/** Each count is damped with sqrt, so one burst can't dominate. */
export const TRENDING_WEIGHTS = {
  newBookmarks: 3,
  newFollows: 3,
  completions: 2,
  reads: 1,
  newRatings: 1,
} as const;
/** Ratings count only with at least this many (same rule as the series page). */
export const RATING_MIN_COUNT = 3;
/** Up to this much for a top average: scaled from 0 at 3.0 stars to the full bonus at 5.0. */
export const TRENDING_RATING_BONUS = 2;
/** A series younger than NEW_SERIES_BOOST_DAYS (from its first episode) gets up to this, fading to 0. */
export const NEW_SERIES_BOOST = 3;
export const NEW_SERIES_BOOST_DAYS = 14;
/** Minus this per day since the latest episode, never more than STALENESS_CAP. */
export const STALENESS_PER_DAY = 0.5;
export const STALENESS_CAP = 5;

// ------------------------------------------------------------------ other shelves

/** Top Rated: Bayesian average, as if every series also had PRIOR_WEIGHT ratings of PRIOR_MEAN (3 x 5.0 stays below 100 x 4.8). */
export const TOP_RATED_PRIOR_WEIGHT = 5;
export const TOP_RATED_PRIOR_MEAN = 4.0;
/** Hidden Gems: average at least this (with RATING_MIN_COUNT+ ratings) and fewer than HIDDEN_GEM_MAX_READS reads. */
export const HIDDEN_GEM_MIN_RATING = 4.3;
export const HIDDEN_GEM_MAX_READS = 50;
/** Quick Reads: the whole series takes this many minutes or fewer. */
export const QUICK_READ_MAX_MINUTES = 10;
/** Weekend Binges: complete, with at least this many episodes. */
export const WEEKEND_BINGE_MIN_EPISODES = 8;
/** Fresh Finishes: completed within this many days. */
export const FRESH_FINISH_DAYS = 30;
/** Just Updated: a new episode within this many days. */
export const JUST_UPDATED_DAYS = 30;
/** Updates from Writers You Follow: a new episode within this many days. */
export const FOLLOWED_UPDATES_DAYS = 14;

// ------------------------------------------------------------------ New Writers

/** A writer is "new" while they have published fewer than this many episodes... */
export const NEW_WRITER_MAX_EPISODES = 5;
/** ...or while their first episode is younger than this (whichever lasts longer). */
export const NEW_WRITER_DAYS = 60;
/** Fairness: writers shown least over this many days come first. */
export const EXPOSURE_WINDOW_DAYS = 7;
/** Exposure rows older than this are deleted by the daily cron. */
export const EXPOSURE_KEEP_DAYS = 14;

// ------------------------------------------------------------------ taste profile

/** Points per signal, applied to the series' genre and to each of its sub tags. */
export const TASTE_WEIGHTS = {
  rated4or5: 2,
  bookmark: 1.5,
  follow: 2,
  finishedEpisode: 1,
  rated1or2: -2,
} as const;
/** Finished episodes count at most this many times per series (a binge isn't ten opinions). */
export const TASTE_FINISHED_CAP_PER_SERIES = 5;
/** A signal loses half its weight every this-many days. */
export const TASTE_HALF_LIFE_DAYS = 30;
/** Signals older than this are not loaded. */
export const TASTE_LOOKBACK_DAYS = 180;
/** Sub tags count this much relative to the genre. */
export const TASTE_TAG_FACTOR = 1;
/** A genre or tag needs at least this score to count; below it on everything the reader is a cold start. */
export const TASTE_MIN_SCORE = 2;
/** "Because you liked": the anchor is a series rated 4+ or bookmarked within this many days. */
export const ANCHOR_DAYS = 60;
/** "Because you liked" similarity: points for the same genre and per shared sub tag. */
export const SIMILARITY_WEIGHTS = { sameGenre: 2, sharedTag: 1 } as const;

// ------------------------------------------------------------------ anti-gaming

/** Activity from accounts younger than this many hours... */
export const NEW_ACCOUNT_HOURS = 48;
/** ...counts this much (0 = ignored). Their ratings never enter averages. */
export const NEW_ACCOUNT_WEIGHT = 0;

/** Administration > Feed > Signals thresholds (reported, never acted on). */
export const SIGNALS = {
  /** Series whose 7-day activity comes mostly from new accounts. */
  newAccountShare: 0.5,
  /** ...with at least this much activity. */
  newAccountMinEvents: 5,
  /** Members who rated more than this many episodes in one hour. */
  ratingsPerHour: 20,
  /** Series whose 7-day activity is this many times the week before. */
  spikeFactor: 10,
  /** ...with at least this much activity this week. */
  spikeMinEvents: 10,
} as const;

// ------------------------------------------------------------------ caching

/** The feed's data (series + stats, shelves, staff picks) is cached this long; publishing clears it. */
export const FEED_CACHE_SECONDS = 15 * 60;
/** When the newest stats are older than this, the next cache rebuild refreshes them first. */
export const STATS_MAX_AGE_MINUTES = 60;
/** At most this many series are considered (the whole catalogue today). */
export const FEED_POOL_LIMIT = 500;
/** Cache tag cleared on publish, shelf edits, holds and restrictions. */
export const FEED_CACHE_TAG = "feed";
