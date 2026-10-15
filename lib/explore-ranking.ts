/*
 * Explore ordering (Sweep B1): the one place that decides what "Trending" and
 * "Newest" mean. Pure and client-safe; lib/explore-catalogue.ts loads the
 * signals in one query and calls rankExplore(). Tune the constants below.
 *
 *   Trending: TRENDING_WEIGHTS.recentReads per distinct read in the last
 *     TRENDING_WINDOW_DAYS, + newFollows per new follow in that window,
 *     + rating × the pooled average (only with RATING_MIN_COUNT+ ratings),
 *     + recency × a boost that fades from 1 to 0 over RECENCY_FADE_DAYS since
 *     the latest episode. Ties: all-time reads, then newest.
 *   Newest: when the series first went public (its first published episode),
 *     newest first; the series' creation date only if that is missing.
 */

export const TRENDING_WINDOW_DAYS = 7;
export const RECENCY_FADE_DAYS = 14;
/** Below this many ratings a series' average is ignored (same rule as the series page). */
export const RATING_MIN_COUNT = 3;

export const TRENDING_WEIGHTS = {
  /** Per distinct (reader, episode) read in the window. */
  recentReads: 1,
  /** Per new follow in the window: rarer than a read and a stronger signal. */
  newFollows: 3,
  /** × the pooled average rating (1-5). */
  rating: 0.5,
  /** × 0-1, fading over RECENCY_FADE_DAYS since the latest episode. */
  recency: 2,
} as const;

export type ExploreSort = "trending" | "newest";
export const EXPLORE_SORTS: ExploreSort[] = ["trending", "newest"];

/** Session cookie (no expiry: gone when the browser closes) remembering the choice for the visit. */
export const EXPLORE_SORT_COOKIE = "df-explore-sort";

export function parseExploreSort(value: string | null | undefined): ExploreSort {
  return value === "newest" ? "newest" : "trending";
}

export type ExploreSignals = {
  id: string;
  reads: number;
  recentReads: number;
  newFollows: number;
  ratingAvg: number | null;
  ratingCount: number;
  firstPublishedAt: Date | null;
  lastPublishedAt: Date | null;
  createdAt: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function trendingScore(series: ExploreSignals, now = Date.now()) {
  const rating = series.ratingAvg !== null && series.ratingCount >= RATING_MIN_COUNT ? series.ratingAvg : 0;
  const daysSinceEpisode = series.lastPublishedAt ? (now - series.lastPublishedAt.getTime()) / DAY_MS : Infinity;
  const recency = Math.max(0, 1 - daysSinceEpisode / RECENCY_FADE_DAYS);
  return (
    TRENDING_WEIGHTS.recentReads * series.recentReads +
    TRENDING_WEIGHTS.newFollows * series.newFollows +
    TRENDING_WEIGHTS.rating * rating +
    TRENDING_WEIGHTS.recency * recency
  );
}

const wentPublic = (series: ExploreSignals) => (series.firstPublishedAt ?? series.createdAt).getTime();

/** Both orders as lists of series ids, so the page can switch between them instantly. */
export function rankExplore(series: ExploreSignals[], now = Date.now()): Record<ExploreSort, string[]> {
  const scores = new Map(series.map((item) => [item.id, trendingScore(item, now)]));
  const trending = [...series].sort(
    (a, b) => scores.get(b.id)! - scores.get(a.id)! || b.reads - a.reads || wentPublic(b) - wentPublic(a),
  );
  const newest = [...series].sort((a, b) => wentPublic(b) - wentPublic(a) || b.reads - a.reads);
  return { trending: trending.map((item) => item.id), newest: newest.map((item) => item.id) };
}
