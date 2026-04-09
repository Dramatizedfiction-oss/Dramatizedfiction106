import { prisma } from "@/lib/prisma";

export async function getNextEpisode(seriesId: string, currentNumber: number) {
  return prisma.episode.findFirst({
    where: {
      seriesId,
      episodeNumber: currentNumber + 1
    },
    orderBy: { episodeNumber: "asc" }
  });
}
