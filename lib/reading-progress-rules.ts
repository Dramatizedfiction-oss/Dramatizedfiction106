// Client-safe rules for reading progress (the service is lib/reading-progress.ts).

/** An episode counts as finished from this percentage. */
export const FINISHED_PERCENT = 95;

export function parsePercent(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export type EpisodeProgress = { episodeId: string; percent: number; updatedAt: Date };

/**
 * Where to pick up in a series (Sweep A): the episode the member read most
 * recently. If they finished it, the next episode instead ("next"); if it was
 * the last one, the first episode ("again"). Null when nothing is started.
 * `episodes` are the published episodes in reading order. Progress elsewhere
 * in the series (older reads, other percentages) doesn't change the answer.
 */
export function continuePoint(
  episodes: { id: string; episodeNumber: number }[],
  progress: EpisodeProgress[],
): { episodeId: string; episodeNumber: number; kind: "continue" | "next" | "again" } | null {
  if (progress.length === 0 || episodes.length === 0) return null;
  const index = new Map(episodes.map((episode, position) => [episode.id, position]));
  const latest = progress
    .filter((row) => index.has(row.episodeId))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  if (!latest) return null;

  const position = index.get(latest.episodeId)!;
  const episode = episodes[position];
  if (latest.percent < FINISHED_PERCENT) return { episodeId: episode.id, episodeNumber: episode.episodeNumber, kind: "continue" };
  const next = episodes[position + 1];
  if (next) return { episodeId: next.id, episodeNumber: next.episodeNumber, kind: "next" };
  return { episodeId: episodes[0].id, episodeNumber: episodes[0].episodeNumber, kind: "again" };
}
