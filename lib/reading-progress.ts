import { findPublicEpisode } from "@/lib/engagement";
import { prisma } from "@/lib/prisma";

/*
 * How far a signed-in member has read each episode (ReadingProgress). The
 * reader reports a percentage at most every 30 seconds and when the page is
 * left; only the furthest point is kept (GREATEST), so scrolling back up
 * never lowers it. Only published, readable episodes count. Rules (finished
 * threshold, continue point) are in lib/reading-progress-rules.ts.
 */

export async function saveProgress(userId: string, episodeId: string, percent: number) {
  const episode = await findPublicEpisode(episodeId);
  if (!episode || episode.locked) return null;
  const rows = await prisma.$queryRaw<{ percent: number }[]>`
    INSERT INTO "ReadingProgress" ("userId", "episodeId", "percent", "updatedAt")
    VALUES (${userId}, ${episode.id}, ${percent}, now())
    ON CONFLICT ("userId", "episodeId")
    DO UPDATE SET "percent" = GREATEST("ReadingProgress"."percent", EXCLUDED."percent"), "updatedAt" = now()
    RETURNING "percent"`;
  return { percent: rows[0]?.percent ?? percent };
}
