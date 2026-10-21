import { findPublicEpisode } from "@/lib/engagement";
import { prisma } from "@/lib/prisma";
import { FINISHED_PERCENT } from "@/lib/reading-progress-rules";

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
  // finishedAt: when the episode was first finished (the feed's completions, Sweep C); never moves after that.
  const rows = await prisma.$queryRaw<{ percent: number }[]>`
    INSERT INTO "ReadingProgress" ("userId", "episodeId", "percent", "updatedAt", "finishedAt")
    VALUES (${userId}, ${episode.id}, ${percent}, now(), ${percent >= FINISHED_PERCENT ? new Date() : null}::timestamp)
    ON CONFLICT ("userId", "episodeId")
    DO UPDATE SET "percent" = GREATEST("ReadingProgress"."percent", EXCLUDED."percent"), "updatedAt" = now(),
      "finishedAt" = COALESCE("ReadingProgress"."finishedAt", EXCLUDED."finishedAt")
    RETURNING "percent"`;
  return { percent: rows[0]?.percent ?? percent };
}
