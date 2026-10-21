import { EXPOSURE_KEEP_DAYS } from "@/lib/feed/config";
import { prisma } from "@/lib/prisma";

/*
 * New Writers impressions (Sweep C), one row per writer per UTC day.
 * Server-only. The shelf shows the writers with the fewest impressions over
 * EXPOSURE_WINDOW_DAYS first.
 */

/** +1 for each writer, in one statement. Returns how many writers were counted. */
export async function recordNewWriterExposure(authorIds: string[]) {
  const ids = [...new Set(authorIds)];
  if (ids.length === 0) return 0;
  await prisma.$executeRaw`
    INSERT INTO "WriterExposure" ("authorId", "day", "impressions")
    SELECT x.author_id, (now() AT TIME ZONE 'UTC')::date, 1 FROM unnest(${ids}::text[]) AS x(author_id)
    WHERE EXISTS (SELECT 1 FROM "User" u WHERE u.id = x.author_id)
    ON CONFLICT ("authorId", "day") DO UPDATE SET "impressions" = "WriterExposure"."impressions" + 1`;
  return ids.length;
}

/** Deletes rows older than EXPOSURE_KEEP_DAYS (daily cron). */
export async function pruneExposure() {
  return prisma.$executeRaw`
    DELETE FROM "WriterExposure" WHERE "day" < (now() AT TIME ZONE 'UTC')::date - ${EXPOSURE_KEEP_DAYS}::int`;
}
