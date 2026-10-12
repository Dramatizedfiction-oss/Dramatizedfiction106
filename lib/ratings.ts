import { parseRatingValue, seriesRatingSummary } from "@/lib/engagement-rules";
import { failure, findPublicEpisode, isEpisodeCreator, type EngagementFailure } from "@/lib/engagement";
import { prisma } from "@/lib/prisma";

/*
 * Episode ratings: 1-5 whole stars, one per member per episode, changeable.
 * Authors can't rate their own episodes (checked here against the series
 * author and the episode author, whatever the UI shows).
 */

type RatingResult = { ok: true; value: number | null } | EngagementFailure;

async function rateableEpisode(userId: string, episodeId: string) {
  const episode = await findPublicEpisode(episodeId);
  if (!episode) return failure(404, "NOT_FOUND", "That episode isn't available.");
  if (episode.locked) return failure(403, "LOCKED", "This episode can't be read right now, so it can't be rated.");
  if (isEpisodeCreator(episode, userId)) return failure(403, "OWN_EPISODE", "You can't rate your own episode.");
  return { ok: true as const, episode };
}

export async function rateEpisode(userId: string, episodeId: string, rawValue: unknown): Promise<RatingResult> {
  const value = parseRatingValue(rawValue);
  if (value === null) return failure(400, "BAD_REQUEST", "Choose from 1 to 5 stars.");
  const check = await rateableEpisode(userId, episodeId);
  if (!check.ok) return check;

  await prisma.rating.upsert({
    where: { userId_episodeId: { userId, episodeId: check.episode.id } },
    create: { userId, episodeId: check.episode.id, value },
    update: { value },
  });
  return { ok: true, value };
}

/** Clears the member's rating. Safe to repeat; allowed even if the episode was unpublished. */
export async function clearRating(userId: string, episodeId: string): Promise<RatingResult> {
  await prisma.rating.deleteMany({ where: { userId, episodeId } });
  return { ok: true, value: null };
}

export async function viewerRating(userId: string, episodeId: string) {
  const row = await prisma.rating.findUnique({
    where: { userId_episodeId: { userId, episodeId } },
    select: { value: true },
  });
  return row?.value ?? null;
}

/**
 * A series' rating: every individual rating across its published episodes,
 * pooled (each vote counts once; never an average of episode averages).
 * One indexed aggregate query. Null while below SERIES_RATING_MIN_COUNT.
 */
export async function seriesRating(seriesId: string) {
  const result = await prisma.rating.aggregate({
    where: { episode: { seriesId, status: "PUBLISHED" } },
    _avg: { value: true },
    _count: { _all: true },
  });
  return seriesRatingSummary(result._avg.value, result._count._all);
}
