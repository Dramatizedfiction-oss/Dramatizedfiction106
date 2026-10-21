import { randomBytes } from "node:crypto";
import { AUDIT, recordAudit } from "@/lib/admin/audit";
import { DEFAULT_MAX_ITEMS, DEFAULT_MIN_ITEMS, NEW_ACCOUNT_HOURS, PERSONAL_RULES, SIGNALS, type FeedRule } from "@/lib/feed/config";
import { ineligibleReasons } from "@/lib/feed/eligibility";
import { invalidateFeed } from "@/lib/feed/invalidate";
import { bayesianRating, ratingAverage, trendingBreakdown } from "@/lib/feed/scoring";
import { explainShelf, isNewWriter } from "@/lib/feed/shelves";
import {
  checkNewTagShelf,
  checkShelfEdit,
  checkStaffPicks,
  shelfKey,
  type SeriesModerationValue,
  type ShelfEdit,
} from "@/lib/feed/shelf-rules";
import { getFreshFeedPool, shelfContext } from "@/lib/feed/server";
import { refreshAllStatsOnce, refreshSeriesStats } from "@/lib/feed/stats";
import type { PoolSeries } from "@/lib/feed/types";
import { prisma } from "@/lib/prisma";
import { knownSeriesTags } from "@/lib/series-tags";

/*
 * Administration > Feed (Sweep C). Server-only; callers have already checked
 * Board/CEO. Every change is audited and clears the feed cache.
 */

type Failure = { ok: false; status: number; code: string; message: string };
const fail = (status: number, code: string, message: string): Failure => ({ ok: false, status, code, message });

export async function listShelves() {
  return prisma.feedShelf.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      items: {
        orderBy: { position: "asc" },
        select: { seriesId: true, series: { select: { title: true, status: true, author: { select: { name: true } } } } },
      },
    },
  });
}

export async function updateShelf(actorId: string, shelfId: string, input: ShelfEdit) {
  const shelf = await prisma.feedShelf.findUnique({ where: { id: shelfId } });
  if (!shelf) return fail(404, "NOT_FOUND", "Shelf not found.");
  const checked = checkShelfEdit(input, shelf);
  if (!checked.ok) return fail(400, "BAD_REQUEST", checked.message);
  await prisma.$transaction(async (tx) => {
    await tx.feedShelf.update({ where: { id: shelf.id }, data: { ...checked.value, updatedById: actorId } });
    await recordAudit(tx, { action: AUDIT.FEED_SHELF_UPDATED, actorId, details: { shelf: shelf.key, ...checked.value } });
  });
  invalidateFeed();
  return { ok: true as const };
}

export async function createTagShelf(actorId: string, input: { name: string; genres: string[]; tags: string[]; months: number[]; weight: number }) {
  const checked = checkNewTagShelf(input);
  if (!checked.ok) return fail(400, "BAD_REQUEST", checked.message);
  const last = await prisma.feedShelf.aggregate({ _max: { sortOrder: true } });
  const shelf = await prisma.$transaction(async (tx) => {
    const created = await tx.feedShelf.create({
      data: {
        key: shelfKey(checked.value.name!, randomBytes(3).toString("hex")),
        name: checked.value.name!,
        tier: "NICHE",
        rule: "TAGS",
        genres: checked.value.genres,
        tags: checked.value.tags,
        weight: checked.value.weight ?? 1,
        months: checked.value.months ?? [],
        minItems: DEFAULT_MIN_ITEMS,
        maxItems: DEFAULT_MAX_ITEMS,
        sortOrder: (last._max.sortOrder ?? 0) + 1,
        updatedById: actorId,
      },
      select: { id: true, key: true },
    });
    await recordAudit(tx, { action: AUDIT.FEED_SHELF_ADDED, actorId, details: { shelf: created.key, tags: checked.value.tags } });
    return created;
  });
  invalidateFeed();
  return { ok: true as const, id: shelf.id };
}

export async function deleteShelf(actorId: string, shelfId: string) {
  const shelf = await prisma.feedShelf.findUnique({ where: { id: shelfId }, select: { id: true, key: true, builtIn: true } });
  if (!shelf) return fail(404, "NOT_FOUND", "Shelf not found.");
  if (shelf.builtIn) return fail(400, "BUILT_IN", "Built-in shelves can be switched off, not deleted.");
  await prisma.$transaction(async (tx) => {
    await tx.feedShelf.delete({ where: { id: shelf.id } });
    await recordAudit(tx, { action: AUDIT.FEED_SHELF_REMOVED, actorId, details: { shelf: shelf.key } });
  });
  invalidateFeed();
  return { ok: true as const };
}

/** `ids` must be every shelf, in the new order. */
export async function reorderShelves(actorId: string, ids: string[]) {
  const existing = await prisma.feedShelf.findMany({ select: { id: true } });
  const all = new Set(existing.map((shelf) => shelf.id));
  if (ids.length !== all.size || new Set(ids).size !== ids.length || !ids.every((id) => all.has(id))) {
    return fail(400, "BAD_REQUEST", "The list of shelves changed; reload and try again.");
  }
  await prisma.$transaction([
    ...ids.map((id, index) => prisma.feedShelf.update({ where: { id }, data: { sortOrder: index + 1 } })),
    prisma.adminAuditLog.create({ data: { action: AUDIT.FEED_SHELVES_REORDERED, actorId } }),
  ]);
  invalidateFeed();
  return { ok: true as const };
}

export async function setStaffPicks(actorId: string, shelfId: string, seriesIds: string[]) {
  const shelf = await prisma.feedShelf.findUnique({ where: { id: shelfId }, select: { id: true, key: true, rule: true } });
  if (!shelf) return fail(404, "NOT_FOUND", "Shelf not found.");
  if (shelf.rule !== "STAFF_PICKS") return fail(400, "BAD_REQUEST", "Only Staff Picks shelves hold hand-picked series.");
  const checked = checkStaffPicks(seriesIds);
  if (!checked.ok) return fail(400, "BAD_REQUEST", checked.message);
  const found = await prisma.series.count({ where: { id: { in: checked.value }, status: "PUBLISHED" } });
  if (found !== checked.value.length) return fail(400, "BAD_REQUEST", "Pick published series only.");
  await prisma.$transaction(async (tx) => {
    await tx.feedShelfItem.deleteMany({ where: { shelfId: shelf.id } });
    await tx.feedShelfItem.createMany({
      data: checked.value.map((seriesId, index) => ({ shelfId: shelf.id, seriesId, position: index + 1, addedById: actorId })),
    });
    await recordAudit(tx, { action: AUDIT.FEED_STAFF_PICKS, actorId, details: { shelf: shelf.key, seriesIds: checked.value } });
  });
  invalidateFeed();
  return { ok: true as const };
}

/** Hold, release, block or send for review. Only VISIBLE series appear in the feed, Explore and rows. */
export async function setSeriesModeration(actorId: string, seriesId: string, status: SeriesModerationValue, note: string) {
  const series = await prisma.series.findUnique({ where: { id: seriesId }, select: { id: true, authorId: true, moderationStatus: true } });
  if (!series) return fail(404, "NOT_FOUND", "Series not found.");
  if (series.moderationStatus === status) return { ok: true as const };
  await prisma.$transaction(async (tx) => {
    await tx.series.update({ where: { id: series.id }, data: { moderationStatus: status } });
    await recordAudit(tx, {
      action: AUDIT.SERIES_MODERATION_CHANGED,
      actorId,
      targetUserId: series.authorId,
      details: { seriesId: series.id, from: series.moderationStatus, to: status, note: note.trim().slice(0, 500) || null },
    });
  });
  invalidateFeed();
  return { ok: true as const };
}

export async function refreshFeedNow() {
  const did = await refreshAllStatsOnce();
  invalidateFeed();
  return did;
}

/** Search published series by title or writer (Staff Picks editor, score breakdown). */
export async function searchSeries(query: string) {
  const q = query.trim();
  if (q.length < 2) return [];
  return prisma.series.findMany({
    where: {
      status: "PUBLISHED",
      OR: [{ title: { contains: q, mode: "insensitive" } }, { author: { name: { contains: q, mode: "insensitive" } } }],
    },
    orderBy: { updatedAt: "desc" },
    take: 12,
    select: { id: true, title: true, moderationStatus: true, author: { select: { name: true } } },
  });
}

// ------------------------------------------------------------------ score breakdown

export async function getScoreBreakdown(seriesId: string) {
  const facts = await prisma.$queryRaw<
    {
      id: string;
      title: string;
      status: string;
      moderationStatus: string;
      authorId: string;
      authorName: string | null;
      publishedEpisodes: bigint;
      authorRestricted: boolean;
    }[]
  >`
    SELECT s.id, s.title, s.status::text AS status, s."moderationStatus"::text AS "moderationStatus", s."authorId",
           u.name AS "authorName",
           (SELECT count(*) FROM "Episode" e WHERE e."seriesId" = s.id AND e.status = 'PUBLISHED') AS "publishedEpisodes",
           EXISTS (SELECT 1 FROM "MemberRestriction" mr WHERE mr."userId" = s."authorId" AND mr."liftedAt" IS NULL
                   AND (mr."endsAt" IS NULL OR mr."endsAt" > now())) AS "authorRestricted"
    FROM "Series" s JOIN "User" u ON u.id = s."authorId"
    WHERE s.id = ${seriesId}`;
  const row = facts[0];
  if (!row) return null;

  if (row.status === "PUBLISHED") await refreshSeriesStats(row.id);
  const [pool, stats] = await Promise.all([getFreshFeedPool(), prisma.seriesStats.findUnique({ where: { seriesId: row.id } })]);
  const now = Date.now();
  const ctx = shelfContext(pool, null, now);
  const reasons = ineligibleReasons({
    status: row.status,
    moderationStatus: row.moderationStatus,
    publishedEpisodes: Number(row.publishedEpisodes),
    authorRestricted: row.authorRestricted,
  });
  const inPool = pool.series.find((series) => series.id === row.id) ?? null;
  const series: PoolSeries | null =
    inPool ??
    (stats
      ? {
          id: row.id,
          title: row.title,
          description: "",
          coverImage: null,
          themeColor: null,
          genre: stats.genre.toLowerCase(),
          tags: knownSeriesTags(stats.tags),
          authorId: row.authorId,
          authorName: row.authorName,
          isComplete: stats.isComplete,
          completedAt: stats.completedAt?.getTime() ?? null,
          episodeCount: stats.episodeCount,
          totalReadMinutes: stats.totalReadMinutes,
          firstPublishedAt: stats.firstPublishedAt?.getTime() ?? null,
          lastPublishedAt: stats.lastPublishedAt?.getTime() ?? null,
          createdAt: 0,
          ratingCount: stats.ratingCount,
          ratingSum: stats.ratingSum,
          bookmarkCount: stats.bookmarkCount,
          followCount: stats.followCount,
          readsTotal: stats.readsTotal,
          reads7d: stats.reads7d,
          completions7d: stats.completions7d,
          newBookmarks7d: stats.newBookmarks7d,
          newFollows7d: stats.newFollows7d,
          newRatings7d: stats.newRatings7d,
          isMature: false,
        }
      : null);

  const trending = series ? trendingBreakdown(series, now) : null;
  const trendingRank = inPool
    ? [...pool.series].sort((a, b) => (ctx.trending.get(b.id) ?? 0) - (ctx.trending.get(a.id) ?? 0)).findIndex((item) => item.id === row.id) + 1
    : null;
  const writer = ctx.writers.get(row.authorId);

  const shelves = pool.shelves.map((shelf) => {
    if (PERSONAL_RULES.includes(shelf.rule as FeedRule)) {
      return { key: shelf.key, name: shelf.name, enabled: shelf.enabled, on: false, rank: null, reason: "Personal shelf: depends on each reader's history." };
    }
    if (!inPool) {
      return { key: shelf.key, name: shelf.name, enabled: shelf.enabled, on: false, rank: null, reason: "Not eligible (see above)." };
    }
    return { key: shelf.key, name: shelf.name, enabled: shelf.enabled, ...explainShelf(inPool, shelf, ctx) };
  });

  return {
    series: { id: row.id, title: row.title, status: row.status, moderationStatus: row.moderationStatus, authorId: row.authorId, authorName: row.authorName },
    eligible: reasons.length === 0 && Boolean(inPool),
    reasons: reasons.length || inPool ? reasons : ["No stats yet: it will appear after the next refresh."],
    stats,
    trending,
    trendingRank,
    poolSize: pool.series.length,
    ratingAverage: series ? ratingAverage(series) : null,
    bayesian: series ? bayesianRating(series) : null,
    newWriter: {
      isNew: isNewWriter(writer, now),
      publishedEpisodes: writer?.publishedEpisodes ?? 0,
      firstPublishedAt: writer?.firstPublishedAt ?? null,
      exposure7d: writer?.exposure7d ?? 0,
    },
    shelves,
  };
}

export type ScoreBreakdown = NonNullable<Awaited<ReturnType<typeof getScoreBreakdown>>>;

// ------------------------------------------------------------------ signals (reported, never acted on)

export async function getSignals() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const previous = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const [newAccountSeries, heavyRaters, spikes] = await Promise.all([
    prisma.$queryRaw<{ id: string; title: string; total: bigint; fromNew: bigint }[]>`
      WITH ev AS (
        SELECT e."seriesId", r."createdAt", r."userId" FROM "Rating" r JOIN "Episode" e ON e.id = r."episodeId" WHERE r."createdAt" >= ${since}
        UNION ALL SELECT e."seriesId", b."createdAt", b."userId" FROM "Bookmark" b JOIN "Episode" e ON e.id = b."episodeId" WHERE b."createdAt" >= ${since}
        UNION ALL SELECT f."seriesId", f."createdAt", f."userId" FROM "SeriesFollow" f WHERE f."createdAt" >= ${since}
      )
      SELECT s.id, s.title, count(*) AS total,
             count(*) FILTER (WHERE u."createdAt" > ev."createdAt" - make_interval(hours => ${NEW_ACCOUNT_HOURS}::int)) AS "fromNew"
      FROM ev JOIN "User" u ON u.id = ev."userId" JOIN "Series" s ON s.id = ev."seriesId"
      GROUP BY s.id, s.title
      HAVING count(*) >= ${SIGNALS.newAccountMinEvents}
         AND count(*) FILTER (WHERE u."createdAt" > ev."createdAt" - make_interval(hours => ${NEW_ACCOUNT_HOURS}::int))::float / count(*) >= ${SIGNALS.newAccountShare}::float
      ORDER BY "fromNew" DESC LIMIT 20`,
    prisma.$queryRaw<{ id: string; name: string | null; hour: Date; count: bigint }[]>`
      SELECT u.id, u.name, date_trunc('hour', r."createdAt") AS hour, count(*) AS count
      FROM "Rating" r JOIN "User" u ON u.id = r."userId"
      WHERE r."createdAt" >= ${since}
      GROUP BY u.id, u.name, date_trunc('hour', r."createdAt")
      HAVING count(*) > ${SIGNALS.ratingsPerHour}
      ORDER BY count DESC LIMIT 20`,
    prisma.$queryRaw<{ id: string; title: string; thisWeek: bigint; lastWeek: bigint }[]>`
      WITH ev AS (
        SELECT e."seriesId", r."createdAt" FROM "ReadEvent" r JOIN "Episode" e ON e.id = r."episodeId" WHERE r."createdAt" >= ${previous}
        UNION ALL SELECT e."seriesId", r."createdAt" FROM "Rating" r JOIN "Episode" e ON e.id = r."episodeId" WHERE r."createdAt" >= ${previous}
        UNION ALL SELECT e."seriesId", b."createdAt" FROM "Bookmark" b JOIN "Episode" e ON e.id = b."episodeId" WHERE b."createdAt" >= ${previous}
        UNION ALL SELECT f."seriesId", f."createdAt" FROM "SeriesFollow" f WHERE f."createdAt" >= ${previous}
      )
      SELECT s.id, s.title,
             count(*) FILTER (WHERE ev."createdAt" >= ${since}) AS "thisWeek",
             count(*) FILTER (WHERE ev."createdAt" < ${since}) AS "lastWeek"
      FROM ev JOIN "Series" s ON s.id = ev."seriesId"
      GROUP BY s.id, s.title
      HAVING count(*) FILTER (WHERE ev."createdAt" >= ${since}) >= ${SIGNALS.spikeMinEvents}
         AND count(*) FILTER (WHERE ev."createdAt" >= ${since}) >= ${SIGNALS.spikeFactor} * GREATEST(count(*) FILTER (WHERE ev."createdAt" < ${since}), 1)
      ORDER BY "thisWeek" DESC LIMIT 20`,
  ]);
  return {
    newAccountSeries: newAccountSeries.map((row) => ({ id: row.id, title: row.title, total: Number(row.total), fromNew: Number(row.fromNew) })),
    heavyRaters: heavyRaters.map((row) => ({ id: row.id, name: row.name, hour: row.hour, count: Number(row.count) })),
    spikes: spikes.map((row) => ({ id: row.id, title: row.title, thisWeek: Number(row.thisWeek), lastWeek: Number(row.lastWeek) })),
  };
}
