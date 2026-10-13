// Client-safe rules for reading progress (the service is lib/reading-progress.ts).

/** An episode counts as finished from this percentage. */
export const FINISHED_PERCENT = 95;

export function parsePercent(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export type EpisodeProgress = { episodeId: string; percent: number; updatedAt: Date };

/**
 * Where to pick up in a series: the most recently read unfinished episode, or
 * the episode after the furthest finished one ("again" when all are finished).
 * Null when nothing is started. `episodes` are the published episodes in
 * reading order.
 */
export function continuePoint(
  episodes: { id: string; episodeNumber: number }[],
  progress: EpisodeProgress[],
): { episodeId: string; episodeNumber: number; kind: "continue" | "next" | "again" } | null {
  if (progress.length === 0 || episodes.length === 0) return null;
  const known = new Set(episodes.map((episode) => episode.id));
  const mine = progress.filter((row) => known.has(row.episodeId));
  if (mine.length === 0) return null;

  const unfinished = mine
    .filter((row) => row.percent < FINISHED_PERCENT)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  if (unfinished) {
    const episode = episodes.find((item) => item.id === unfinished.episodeId)!;
    return { episodeId: episode.id, episodeNumber: episode.episodeNumber, kind: "continue" };
  }

  const finished = new Set(mine.map((row) => row.episodeId));
  const furthest = episodes.reduce((last, episode, index) => (finished.has(episode.id) ? index : last), -1);
  const next = episodes[furthest + 1];
  if (next) return { episodeId: next.id, episodeNumber: next.episodeNumber, kind: "next" };
  return { episodeId: episodes[0].id, episodeNumber: episodes[0].episodeNumber, kind: "again" };
}
