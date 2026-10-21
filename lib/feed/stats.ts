import { Prisma } from "@prisma/client";
import { NEW_ACCOUNT_HOURS, NEW_ACCOUNT_WEIGHT, STATS_MAX_AGE_MINUTES, TRENDING_WINDOW_DAYS } from "@/lib/feed/config";
import { prisma } from "@/lib/prisma";
import { FINISHED_PERCENT } from "@/lib/reading-progress-rules";
import { SERIES_TAGS } from "@/lib/series-tags";

/*
 * SeriesStats refresh (Sweep C). Server-only. One INSERT ... SELECT for every
 * published series (or just one), so the feed never counts on a page view.
 *   - Activity by the series' author (or the episode's author) never counts.
 *   - Activity made while the account was younger than NEW_ACCOUNT_HOURS
 *     counts NEW_ACCOUNT_WEIGHT, and such ratings never enter the average
 *     (judged at the time of the action, so it never starts counting later).
 *   - Reads are distinct (reader, episode) pairs in the window (ReadEvent is
 *     already one per reader per episode per day, without self-reads).
 *   - Completions are episodes whose progress first reached FINISHED_PERCENT
 *     in the window (ReadingProgress.finishedAt).
 * Called by the publish route and Studio series edits (one series), by the
 * feed when the stats are over STATS_MAX_AGE_MINUTES old, and by the cron.
 */

type Tx = Prisma.TransactionClient | typeof prisma;

export async function refreshSeriesStats(seriesId: string | null = null, db: Tx = prisma) {
  const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const known = SERIES_TAGS.map((tag) => tag.toLowerCase());
  // The account was new when it acted: younger than NEW_ACCOUNT_HOURS at `at`.
  const isNew = (at: string) => Prisma.sql`u."createdAt" > ${Prisma.raw(at)} - make_interval(hours => ${NEW_ACCOUNT_HOURS}::int)`;
  // w: 1 for an established account, NEW_ACCOUNT_WEIGHT for a new one.
  const weight = (at: string) => Prisma.sql`(CASE WHEN ${isNew(at)} THEN ${NEW_ACCOUNT_WEIGHT}::float ELSE 1::float END)`;

  await db.$executeRaw`
    WITH target AS (
      SELECT s.id, s."authorId", lower(s.genre) AS genre, s."isComplete", s."completedAt", s.reads,
             ARRAY(SELECT t FROM unnest(s.tags) t WHERE lower(t) = ANY(${known}::text[])) AS tags
      FROM "Series" s
      WHERE s.status = 'PUBLISHED' AND (${seriesId}::text IS NULL OR s.id = ${seriesId}::text)
    ),
    eps AS (
      SELECT e."seriesId", count(*) AS count, COALESCE(sum(e."readTime"), 0) AS minutes,
             min(e."publishedAt") AS first, max(e."publishedAt") AS last
      FROM "Episode" e JOIN target t ON t.id = e."seriesId"
      WHERE e.status = 'PUBLISHED'
      GROUP BY e."seriesId"
    ),
    rat AS (
      SELECT e."seriesId",
             count(*) FILTER (WHERE NOT ${isNew('r."createdAt"')}) AS count,
             COALESCE(sum(r.value) FILTER (WHERE NOT ${isNew('r."createdAt"')}), 0) AS total,
             COALESCE(sum(${weight('r."createdAt"')}) FILTER (WHERE r."createdAt" >= ${since}), 0) AS recent
      FROM "Rating" r
      JOIN "Episode" e ON e.id = r."episodeId"
      JOIN target t ON t.id = e."seriesId"
      JOIN "User" u ON u.id = r."userId"
      WHERE e.status = 'PUBLISHED' AND r."userId" <> t."authorId" AND r."userId" <> e."authorId"
      GROUP BY e."seriesId"
    ),
    bm AS (
      SELECT e."seriesId", COALESCE(sum(${weight('b."createdAt"')}), 0) AS total,
             COALESCE(sum(${weight('b."createdAt"')}) FILTER (WHERE b."createdAt" >= ${since}), 0) AS recent
      FROM "Bookmark" b
      JOIN "Episode" e ON e.id = b."episodeId"
      JOIN target t ON t.id = e."seriesId"
      JOIN "User" u ON u.id = b."userId"
      WHERE e.status = 'PUBLISHED' AND b."userId" <> t."authorId" AND b."userId" <> e."authorId"
      GROUP BY e."seriesId"
    ),
    fol AS (
      SELECT f."seriesId", COALESCE(sum(${weight('f."createdAt"')}), 0) AS total,
             COALESCE(sum(${weight('f."createdAt"')}) FILTER (WHERE f."createdAt" >= ${since}), 0) AS recent
      FROM "SeriesFollow" f
      JOIN target t ON t.id = f."seriesId"
      JOIN "User" u ON u.id = f."userId"
      WHERE f."userId" <> t."authorId"
      GROUP BY f."seriesId"
    ),
    rd AS (
      SELECT x."seriesId", COALESCE(sum(${weight('x."createdAt"')}), 0) AS recent
      FROM (
        SELECT r."userId", r."episodeId", e."seriesId", min(r."createdAt") AS "createdAt"
        FROM "ReadEvent" r
        JOIN "Episode" e ON e.id = r."episodeId"
        JOIN target t ON t.id = e."seriesId"
        WHERE r."userId" IS NOT NULL AND r."createdAt" >= ${since} AND e.status = 'PUBLISHED'
          AND r."userId" <> t."authorId" AND r."userId" <> e."authorId"
        GROUP BY r."userId", r."episodeId", e."seriesId"
      ) x
      JOIN "User" u ON u.id = x."userId"
      GROUP BY x."seriesId"
    ),
    comp AS (
      SELECT e."seriesId", COALESCE(sum(${weight('p."finishedAt"')}), 0) AS recent
      FROM "ReadingProgress" p
      JOIN "Episode" e ON e.id = p."episodeId"
      JOIN target t ON t.id = e."seriesId"
      JOIN "User" u ON u.id = p."userId"
      WHERE p."finishedAt" >= ${since} AND p.percent >= ${FINISHED_PERCENT} AND e.status = 'PUBLISHED'
        AND p."userId" <> t."authorId" AND p."userId" <> e."authorId"
      GROUP BY e."seriesId"
    )
    INSERT INTO "SeriesStats" (
      "seriesId", "authorId", genre, tags, "isComplete", "completedAt", "episodeCount", "totalReadMinutes",
      "firstPublishedAt", "lastPublishedAt", "ratingCount", "ratingSum", "bookmarkCount", "followCount", "readsTotal",
      "reads7d", "completions7d", "newBookmarks7d", "newFollows7d", "newRatings7d", "computedAt"
    )
    SELECT t.id, t."authorId", t.genre, t.tags, t."isComplete", t."completedAt",
           COALESCE(eps.count, 0), COALESCE(eps.minutes, 0), eps.first, eps.last,
           COALESCE(rat.count, 0), COALESCE(rat.total, 0),
           round(COALESCE(bm.total, 0))::int, round(COALESCE(fol.total, 0))::int, t.reads,
           COALESCE(rd.recent, 0), COALESCE(comp.recent, 0), COALESCE(bm.recent, 0), COALESCE(fol.recent, 0), COALESCE(rat.recent, 0),
           now()
    FROM target t
    LEFT JOIN eps ON eps."seriesId" = t.id
    LEFT JOIN rat ON rat."seriesId" = t.id
    LEFT JOIN bm ON bm."seriesId" = t.id
    LEFT JOIN fol ON fol."seriesId" = t.id
    LEFT JOIN rd ON rd."seriesId" = t.id
    LEFT JOIN comp ON comp."seriesId" = t.id
    ON CONFLICT ("seriesId") DO UPDATE SET
      "authorId" = EXCLUDED."authorId", genre = EXCLUDED.genre, tags = EXCLUDED.tags,
      "isComplete" = EXCLUDED."isComplete", "completedAt" = EXCLUDED."completedAt",
      "episodeCount" = EXCLUDED."episodeCount", "totalReadMinutes" = EXCLUDED."totalReadMinutes",
      "firstPublishedAt" = EXCLUDED."firstPublishedAt", "lastPublishedAt" = EXCLUDED."lastPublishedAt",
      "ratingCount" = EXCLUDED."ratingCount", "ratingSum" = EXCLUDED."ratingSum",
      "bookmarkCount" = EXCLUDED."bookmarkCount", "followCount" = EXCLUDED."followCount", "readsTotal" = EXCLUDED."readsTotal",
      "reads7d" = EXCLUDED."reads7d", "completions7d" = EXCLUDED."completions7d",
      "newBookmarks7d" = EXCLUDED."newBookmarks7d", "newFollows7d" = EXCLUDED."newFollows7d",
      "newRatings7d" = EXCLUDED."newRatings7d", "computedAt" = EXCLUDED."computedAt"`;

  if (seriesId === null) {
    // Series no longer published lose their row (they can't be eligible anyway).
    await db.$executeRaw`
      DELETE FROM "SeriesStats" st
      WHERE NOT EXISTS (SELECT 1 FROM "Series" s WHERE s.id = st."seriesId" AND s.status = 'PUBLISHED')`;
  }
}

/** True when stats are missing for a published series or older than STATS_MAX_AGE_MINUTES. */
export async function statsAreStale(db: Tx = prisma) {
  const cutoff = new Date(Date.now() - STATS_MAX_AGE_MINUTES * 60 * 1000);
  const rows = await db.$queryRaw<{ stale: boolean }[]>`
    SELECT (
      EXISTS (SELECT 1 FROM "Series" s LEFT JOIN "SeriesStats" st ON st."seriesId" = s.id
              WHERE s.status = 'PUBLISHED' AND st."seriesId" IS NULL)
      OR COALESCE((SELECT min("computedAt") FROM "SeriesStats"), now()) < ${cutoff}
    ) AS stale`;
  return Boolean(rows[0]?.stale);
}

/**
 * Full refresh, one at a time across all servers: a request that finds
 * another refresh running skips it (the other one will finish the job).
 * Returns whether this call did the refresh.
 */
export async function refreshAllStatsOnce() {
  return prisma.$transaction(
    async (tx) => {
      const lock = await tx.$queryRaw<{ ok: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext('df:feed-stats')) AS ok`;
      if (!lock[0]?.ok) return false;
      await refreshSeriesStats(null, tx);
      return true;
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
}
