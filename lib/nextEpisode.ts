import { PUBLIC_EPISODE_WHERE } from "@/lib/content-visibility";
import { prisma } from "@/lib/prisma";

/**
 * The next episode a reader can open: the lowest-numbered published episode
 * after `currentNumber` in the same (published) series. Unpublished drafts in
 * between are skipped, never linked. `episodeNumber` is the series-wide
 * reading order, so this crosses season boundaries (Sweep G/I); the season
 * comes along so the reader can mark "Season 2 begins".
 */
export async function getNextEpisode(seriesId: string, currentNumber: number) {
  return prisma.episode.findFirst({
    where: {
      seriesId,
      episodeNumber: { gt: currentNumber },
      ...PUBLIC_EPISODE_WHERE,
    },
    orderBy: { episodeNumber: "asc" },
    include: { season: { select: { number: true, title: true } } },
  });
}
