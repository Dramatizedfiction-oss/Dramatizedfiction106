import {
  ANCHOR_DAYS,
  TASTE_FINISHED_CAP_PER_SERIES,
  TASTE_HALF_LIFE_DAYS,
  TASTE_MIN_SCORE,
  TASTE_TAG_FACTOR,
  TASTE_WEIGHTS,
} from "@/lib/feed/config";
import { DAY_MS } from "@/lib/feed/scoring";
import type { ReaderSignals } from "@/lib/feed/types";

/*
 * A reader's taste (Sweep C): points per genre and per sub tag from their
 * ratings, bookmarks, follows and finished episodes, each fading with a
 * TASTE_HALF_LIFE_DAYS half-life. Pure and client-safe.
 */

export type TasteProfile = {
  genres: Record<string, number>;
  tags: Record<string, number>;
  /** False when nothing reaches TASTE_MIN_SCORE: a cold start, so no personal shelves from taste. */
  hasTaste: boolean;
  topGenre: string | null;
};

export function decay(at: number, now: number) {
  const ageDays = Math.max(0, (now - at) / DAY_MS);
  return Math.pow(0.5, ageDays / TASTE_HALF_LIFE_DAYS);
}

export function buildTasteProfile(signals: ReaderSignals | null, now = Date.now()): TasteProfile {
  const genres: Record<string, number> = {};
  const tags: Record<string, number> = {};
  if (!signals) return { genres, tags, hasTaste: false, topGenre: null };

  const add = (seriesId: string, points: number, at: number) => {
    const meta = signals.seriesMeta[seriesId];
    if (!meta || points === 0) return;
    const value = points * decay(at, now);
    const genre = meta.genre.toLowerCase();
    genres[genre] = (genres[genre] ?? 0) + value;
    for (const tag of meta.tags) tags[tag] = (tags[tag] ?? 0) + value * TASTE_TAG_FACTOR;
  };

  for (const rating of signals.ratings) {
    if (rating.value >= 4) add(rating.seriesId, TASTE_WEIGHTS.rated4or5, rating.at);
    else if (rating.value <= 2) add(rating.seriesId, TASTE_WEIGHTS.rated1or2, rating.at);
  }
  for (const bookmark of signals.bookmarks) add(bookmark.seriesId, TASTE_WEIGHTS.bookmark, bookmark.at);
  for (const follow of signals.follows) add(follow.seriesId, TASTE_WEIGHTS.follow, follow.at);
  const finishedPerSeries = new Map<string, number>();
  for (const row of [...signals.finished].sort((a, b) => b.at - a.at)) {
    const seen = finishedPerSeries.get(row.seriesId) ?? 0;
    if (seen >= TASTE_FINISHED_CAP_PER_SERIES) continue;
    finishedPerSeries.set(row.seriesId, seen + 1);
    add(row.seriesId, TASTE_WEIGHTS.finishedEpisode, row.at);
  }

  const best = (scores: Record<string, number>) =>
    Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? null;
  const topGenreEntry = best(genres);
  const topTagEntry = best(tags);
  const topGenre = topGenreEntry && topGenreEntry[1] >= TASTE_MIN_SCORE ? topGenreEntry[0] : null;
  const hasTaste = Boolean(topGenre) || Boolean(topTagEntry && topTagEntry[1] >= TASTE_MIN_SCORE);
  return { genres, tags, hasTaste, topGenre };
}

/** The series "Because you liked" is built around: the latest 4-5 star rating or bookmark within ANCHOR_DAYS. */
export function pickAnchor(signals: ReaderSignals | null, isEligible: (seriesId: string) => boolean, now = Date.now()) {
  if (!signals) return null;
  const since = now - ANCHOR_DAYS * DAY_MS;
  const liked = [
    ...signals.ratings.filter((row) => row.value >= 4).map((row) => ({ seriesId: row.seriesId, at: row.at })),
    ...signals.bookmarks,
  ]
    .filter((row) => row.at >= since && isEligible(row.seriesId))
    .sort((a, b) => b.at - a.at);
  return liked[0]?.seriesId ?? null;
}
