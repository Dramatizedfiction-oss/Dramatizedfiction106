import {
  HIDDEN_GEM_MAX_READS,
  HIDDEN_GEM_MIN_RATING,
  NEW_SERIES_BOOST,
  NEW_SERIES_BOOST_DAYS,
  RATING_MIN_COUNT,
  STALENESS_CAP,
  STALENESS_PER_DAY,
  TOP_RATED_PRIOR_MEAN,
  TOP_RATED_PRIOR_WEIGHT,
  TRENDING_RATING_BONUS,
  TRENDING_WEIGHTS,
} from "@/lib/feed/config";
import type { PoolSeries } from "@/lib/feed/types";

/*
 * Series scores for the feed and Explore (Sweep C). Pure and client-safe; the
 * constants are in lib/feed/config.ts. trendingBreakdown() returns every term
 * so Administration > Feed can show exactly how a score was made.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

type Stats = Pick<
  PoolSeries,
  | "ratingCount"
  | "ratingSum"
  | "readsTotal"
  | "reads7d"
  | "completions7d"
  | "newBookmarks7d"
  | "newFollows7d"
  | "newRatings7d"
  | "firstPublishedAt"
  | "lastPublishedAt"
>;

/** The average rating, or null below RATING_MIN_COUNT ratings. */
export function ratingAverage(series: Pick<Stats, "ratingCount" | "ratingSum">): number | null {
  return series.ratingCount >= RATING_MIN_COUNT ? series.ratingSum / series.ratingCount : null;
}

/** Top Rated's adjusted average (null below RATING_MIN_COUNT ratings). */
export function bayesianRating(series: Pick<Stats, "ratingCount" | "ratingSum">): number | null {
  if (series.ratingCount < RATING_MIN_COUNT) return null;
  return (TOP_RATED_PRIOR_WEIGHT * TOP_RATED_PRIOR_MEAN + series.ratingSum) / (TOP_RATED_PRIOR_WEIGHT + series.ratingCount);
}

export function isHiddenGem(series: Pick<Stats, "ratingCount" | "ratingSum" | "readsTotal">) {
  const average = ratingAverage(series);
  return average !== null && average >= HIDDEN_GEM_MIN_RATING && series.readsTotal < HIDDEN_GEM_MAX_READS;
}

export type TrendingBreakdown = {
  newBookmarks: number;
  newFollows: number;
  completions: number;
  reads: number;
  newRatings: number;
  ratingBonus: number;
  newSeriesBoost: number;
  staleness: number;
  total: number;
};

const days = (from: number | null, now: number) => (from === null ? Infinity : Math.max(0, (now - from) / DAY_MS));

export function trendingBreakdown(series: Stats, now = Date.now()): TrendingBreakdown {
  const damp = (value: number) => Math.sqrt(Math.max(0, value));
  const average = ratingAverage(series);
  const age = days(series.firstPublishedAt, now);
  const sinceEpisode = days(series.lastPublishedAt, now);
  const parts = {
    newBookmarks: TRENDING_WEIGHTS.newBookmarks * damp(series.newBookmarks7d),
    newFollows: TRENDING_WEIGHTS.newFollows * damp(series.newFollows7d),
    completions: TRENDING_WEIGHTS.completions * damp(series.completions7d),
    reads: TRENDING_WEIGHTS.reads * damp(series.reads7d),
    newRatings: TRENDING_WEIGHTS.newRatings * damp(series.newRatings7d),
    ratingBonus: average === null ? 0 : TRENDING_RATING_BONUS * Math.min(1, Math.max(0, (average - 3) / 2)),
    newSeriesBoost: NEW_SERIES_BOOST * Math.max(0, 1 - age / NEW_SERIES_BOOST_DAYS),
    staleness: -Math.min(STALENESS_CAP, STALENESS_PER_DAY * (Number.isFinite(sinceEpisode) ? sinceEpisode : STALENESS_CAP / STALENESS_PER_DAY)),
  };
  const total = Object.values(parts).reduce((sum, value) => sum + value, 0);
  return { ...parts, total };
}

export function trendingScore(series: Stats, now = Date.now()) {
  return trendingBreakdown(series, now).total;
}
