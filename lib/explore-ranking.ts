import { trendingScore } from "@/lib/feed/scoring";
import type { PoolSeries } from "@/lib/feed/types";

/*
 * Explore ordering (Sweep B1, scores since Sweep C): the one place that
 * decides what Explore's "Trending" and "Newest" mean. Pure and client-safe.
 *   Trending: the feed's Trending score (lib/feed/scoring.ts, constants in
 *     lib/feed/config.ts). Ties: all-time reads, then newest.
 *   Newest: when the series first went public (its first published episode),
 *     newest first; the series' creation date only if that is missing.
 * The data comes from the feed's cached pool (lib/explore-catalogue.ts).
 */

export type ExploreSort = "trending" | "newest";
export const EXPLORE_SORTS: ExploreSort[] = ["trending", "newest"];

/** Session cookie (no expiry: gone when the browser closes) remembering the choice for the visit. */
export const EXPLORE_SORT_COOKIE = "df-explore-sort";

export function parseExploreSort(value: string | null | undefined): ExploreSort {
  return value === "newest" ? "newest" : "trending";
}

export type ExploreSignals = Pick<
  PoolSeries,
  | "id"
  | "readsTotal"
  | "reads7d"
  | "completions7d"
  | "newBookmarks7d"
  | "newFollows7d"
  | "newRatings7d"
  | "ratingCount"
  | "ratingSum"
  | "firstPublishedAt"
  | "lastPublishedAt"
  | "createdAt"
>;

const wentPublic = (series: ExploreSignals) => series.firstPublishedAt ?? series.createdAt;

/** Both orders as lists of series ids, so the page can switch between them instantly. */
export function rankExplore(series: ExploreSignals[], now = Date.now()): Record<ExploreSort, string[]> {
  const scores = new Map(series.map((item) => [item.id, trendingScore(item, now)]));
  const trending = [...series].sort(
    (a, b) => scores.get(b.id)! - scores.get(a.id)! || b.readsTotal - a.readsTotal || wentPublic(b) - wentPublic(a),
  );
  const newest = [...series].sort((a, b) => wentPublic(b) - wentPublic(a) || b.readsTotal - a.readsTotal);
  return { trending: trending.map((item) => item.id), newest: newest.map((item) => item.id) };
}
