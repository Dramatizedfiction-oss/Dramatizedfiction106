import { unstable_cache } from "next/cache";
import { DEFAULT_MAX_ITEMS, EXPOSURE_WINDOW_DAYS, FEED_CACHE_SECONDS, FEED_CACHE_TAG, FEED_FIRST_LOAD, FEED_LOAD_MORE, FEED_POOL_LIMIT, TASTE_LOOKBACK_DAYS, type FeedRule, type FeedTier } from "@/lib/feed/config";
import { composeFeed, feedSeed } from "@/lib/feed/composer";
import { eligibleSeries } from "@/lib/feed/eligibility";
import { makeTrendingMap, type ShelfContext } from "@/lib/feed/shelves";
import { refreshAllStatsOnce, statsAreStale } from "@/lib/feed/stats";
import { buildTasteProfile, pickAnchor } from "@/lib/feed/taste";
import type { ComposedShelf, FeedPool, PoolSeries, ReaderSignals } from "@/lib/feed/types";
import { prisma } from "@/lib/prisma";
import { knownSeriesTags } from "@/lib/series-tags";
import { rankExplore, type ExploreSort } from "@/lib/explore-ranking";

/*
 * The feed's one server module (Sweep C). Server-only.
 *   getFeedPool()  every eligible series with its SeriesStats, per-writer
 *                  facts and the shelf settings: cached FEED_CACHE_SECONDS
 *                  under the "feed" tag (cleared on publish, shelf edits,
 *                  holds and restrictions). A rebuild refreshes stale stats
 *                  first. ~3 queries per rebuild, 0 on a cache hit.
 *   getFeed()      the composed shelves for one reader: +1 query for a
 *                  signed-in reader's history, none for signed-out visitors.
 * Explore's catalogue and top row come from the same pool (lib/explore-catalogue.ts).
 */

/** Explore's top row length (it is shown above the feed, so shelves don't repeat it). */
export const TOP_ROW_SIZE = 12;

type PoolRow = {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  themeColor: string | null;
  authorName: string | null;
  createdAt: Date;
  authorId: string;
  genre: string;
  tags: string[];
  isComplete: boolean;
  completedAt: Date | null;
  episodeCount: number;
  totalReadMinutes: number;
  firstPublishedAt: Date | null;
  lastPublishedAt: Date | null;
  ratingCount: number;
  ratingSum: number;
  bookmarkCount: number;
  followCount: number;
  readsTotal: number;
  reads7d: number;
  completions7d: number;
  newBookmarks7d: number;
  newFollows7d: number;
  newRatings7d: number;
  computedAt: Date;
};

const ms = (value: Date | null) => (value ? value.getTime() : null);

async function buildPool(): Promise<FeedPool> {
  try {
    if (await statsAreStale()) await refreshAllStatsOnce();
  } catch (error) {
    // Old numbers are better than no feed.
    console.error("Feed stats refresh failed; using the stored numbers.", error);
  }

  const exposureSince = new Date(Date.now() - EXPOSURE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [rows, writers, shelves] = await Promise.all([
    prisma.$queryRaw<PoolRow[]>`
      SELECT s.id, s.title, left(s.description, 300) AS description, s."coverImage", s."themeColor", s."createdAt",
             u.name AS "authorName", st."authorId", st.genre, st.tags, st."isComplete", st."completedAt",
             st."episodeCount", st."totalReadMinutes", st."firstPublishedAt", st."lastPublishedAt",
             st."ratingCount", st."ratingSum", st."bookmarkCount", st."followCount", st."readsTotal",
             st."reads7d", st."completions7d", st."newBookmarks7d", st."newFollows7d", st."newRatings7d", st."computedAt"
      FROM "Series" s
      JOIN "SeriesStats" st ON st."seriesId" = s.id
      JOIN "User" u ON u.id = s."authorId"
      WHERE ${eligibleSeries()}
      ORDER BY st."lastPublishedAt" DESC NULLS LAST
      LIMIT ${FEED_POOL_LIMIT}`,
    prisma.$queryRaw<{ authorId: string; publishedEpisodes: bigint; firstPublishedAt: Date | null; exposure7d: bigint | null }[]>`
      SELECT s."authorId", count(e.id) AS "publishedEpisodes", min(e."publishedAt") AS "firstPublishedAt",
             (SELECT sum(x.impressions) FROM "WriterExposure" x WHERE x."authorId" = s."authorId" AND x.day >= ${exposureSince}::date) AS "exposure7d"
      FROM "Episode" e JOIN "Series" s ON s.id = e."seriesId"
      WHERE e.status = 'PUBLISHED' AND s.status = 'PUBLISHED'
      GROUP BY s."authorId"`,
    prisma.feedShelf.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { items: { orderBy: { position: "asc" }, select: { seriesId: true } } },
    }),
  ]);

  return {
    series: rows.map(
      (row): PoolSeries => ({
        id: row.id,
        title: row.title,
        description: row.description,
        coverImage: row.coverImage,
        themeColor: row.themeColor,
        genre: row.genre.toLowerCase(),
        tags: knownSeriesTags(row.tags),
        authorId: row.authorId,
        authorName: row.authorName,
        isComplete: row.isComplete,
        completedAt: ms(row.completedAt),
        episodeCount: row.episodeCount,
        totalReadMinutes: row.totalReadMinutes,
        firstPublishedAt: ms(row.firstPublishedAt),
        lastPublishedAt: ms(row.lastPublishedAt),
        createdAt: row.createdAt.getTime(),
        ratingCount: row.ratingCount,
        ratingSum: row.ratingSum,
        bookmarkCount: row.bookmarkCount,
        followCount: row.followCount,
        readsTotal: row.readsTotal,
        reads7d: row.reads7d,
        completions7d: row.completions7d,
        newBookmarks7d: row.newBookmarks7d,
        newFollows7d: row.newFollows7d,
        newRatings7d: row.newRatings7d,
        isMature: false,
      }),
    ),
    writers: writers.map((row) => ({
      authorId: row.authorId,
      publishedEpisodes: Number(row.publishedEpisodes),
      firstPublishedAt: ms(row.firstPublishedAt),
      exposure7d: Number(row.exposure7d ?? 0),
    })),
    shelves: shelves.map((shelf) => ({
      id: shelf.id,
      key: shelf.key,
      name: shelf.name,
      tier: shelf.tier as FeedTier,
      rule: shelf.rule as FeedRule,
      genres: shelf.genres,
      tags: shelf.tags,
      weight: shelf.weight,
      minItems: shelf.minItems,
      maxItems: shelf.maxItems || DEFAULT_MAX_ITEMS,
      enabled: shelf.enabled,
      sortOrder: shelf.sortOrder,
      builtIn: shelf.builtIn,
      months: shelf.months,
      items: shelf.items.map((item) => item.seriesId),
    })),
    builtAt: Date.now(),
    statsComputedAt: rows.length ? Math.min(...rows.map((row) => row.computedAt.getTime())) : null,
  };
}

const cachedPool = unstable_cache(buildPool, ["feed-pool-v1"], { revalidate: FEED_CACHE_SECONDS, tags: [FEED_CACHE_TAG] });

/** The cached pool (built at most every FEED_CACHE_SECONDS, or after a publish/edit). */
export function getFeedPool(): Promise<FeedPool> {
  return cachedPool();
}

/** A fresh, uncached pool (Administration > Feed's score breakdown). */
export function getFreshFeedPool(): Promise<FeedPool> {
  return buildPool();
}

type SignalRow = {
  kind: "rating" | "bookmark" | "follow" | "finished" | "progress" | "author";
  seriesId: string;
  value: number | null;
  at: Date;
  episodeNumber: number | null;
  lastEpisodeNumber: number | null;
  genre: string | null;
  tags: string[] | null;
  title: string | null;
};

/** Everything the feed needs about a reader's history, in one query. */
export async function loadReaderSignals(readerId: string): Promise<ReaderSignals> {
  const since = new Date(Date.now() - TASTE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<SignalRow[]>`
    WITH events AS (
      SELECT 'rating' AS kind, e."seriesId", r.value, r."updatedAt" AS at, NULL::int AS "episodeNumber", NULL::int AS "lastEpisodeNumber"
      FROM "Rating" r JOIN "Episode" e ON e.id = r."episodeId"
      WHERE r."userId" = ${readerId} AND r."updatedAt" >= ${since}
      UNION ALL
      SELECT 'bookmark', e."seriesId", NULL, b."createdAt", NULL, NULL
      FROM "Bookmark" b JOIN "Episode" e ON e.id = b."episodeId"
      WHERE b."userId" = ${readerId} AND b."createdAt" >= ${since}
      UNION ALL
      SELECT 'follow', f."seriesId", NULL, f."createdAt", NULL, NULL
      FROM "SeriesFollow" f WHERE f."userId" = ${readerId}
      UNION ALL
      SELECT 'finished', e."seriesId", NULL, p."finishedAt", NULL, NULL
      FROM "ReadingProgress" p JOIN "Episode" e ON e.id = p."episodeId"
      WHERE p."userId" = ${readerId} AND p."finishedAt" >= ${since}
      UNION ALL
      SELECT * FROM (
        SELECT DISTINCT ON (e."seriesId") 'progress', e."seriesId", p.percent, p."updatedAt", e."episodeNumber",
               (SELECT max(x."episodeNumber") FROM "Episode" x WHERE x."seriesId" = e."seriesId" AND x.status = 'PUBLISHED')
        FROM "ReadingProgress" p JOIN "Episode" e ON e.id = p."episodeId"
        WHERE p."userId" = ${readerId} AND p."updatedAt" >= ${since} AND e.status = 'PUBLISHED'
        ORDER BY e."seriesId", p."updatedAt" DESC
      ) latest
      UNION ALL
      SELECT 'author', a."authorId", NULL, a."createdAt", NULL, NULL
      FROM "AuthorFollow" a WHERE a."followerId" = ${readerId}
    )
    SELECT ev.kind, ev."seriesId", ev.value, ev.at, ev."episodeNumber", ev."lastEpisodeNumber",
           s.genre, s.tags, s.title
    FROM events ev LEFT JOIN "Series" s ON ev.kind <> 'author' AND s.id = ev."seriesId"`;

  const signals: ReaderSignals = {
    readerId,
    ratings: [],
    bookmarks: [],
    follows: [],
    finished: [],
    progress: [],
    followedAuthors: [],
    seriesMeta: {},
  };
  for (const row of rows) {
    const at = row.at.getTime();
    if (row.kind !== "author" && row.genre !== null) {
      signals.seriesMeta[row.seriesId] = { genre: row.genre.toLowerCase(), tags: knownSeriesTags(row.tags), title: row.title ?? "" };
    }
    if (row.kind === "rating") signals.ratings.push({ seriesId: row.seriesId, value: Number(row.value), at });
    else if (row.kind === "bookmark") signals.bookmarks.push({ seriesId: row.seriesId, at });
    else if (row.kind === "follow") signals.follows.push({ seriesId: row.seriesId, at });
    else if (row.kind === "finished") signals.finished.push({ seriesId: row.seriesId, at });
    else if (row.kind === "author") signals.followedAuthors.push(row.seriesId);
    else
      signals.progress.push({
        seriesId: row.seriesId,
        percent: Number(row.value),
        at,
        episodeNumber: Number(row.episodeNumber),
        lastEpisodeNumber: Number(row.lastEpisodeNumber ?? 0),
      });
  }
  return signals;
}

export function shelfContext(pool: FeedPool, signals: ReaderSignals | null, now = Date.now()): ShelfContext {
  const eligible = new Set(pool.series.map((series) => series.id));
  const taste = buildTasteProfile(signals, now);
  return {
    pool: pool.series,
    writers: new Map(pool.writers.map((writer) => [writer.authorId, writer])),
    now,
    signals,
    taste,
    anchorId: pickAnchor(signals, (id) => eligible.has(id), now),
    trending: makeTrendingMap(pool.series, now),
  };
}

export type FeedPage = {
  shelves: ComposedShelf[];
  /** Index of the next shelf, or null when there are no more. */
  next: number | null;
  /** Writers shown on New Writers in this page (for exposure counting). */
  newWriterAuthorIds: string[];
  /** Series kept by today's priority shelves, which Explore's top row leaves out (so nothing shows twice). */
  reservedIds: string[];
};

/** Explore's top row: the order's first TOP_ROW_SIZE series, without the reserved ones. */
export function topRowIds(order: string[], reserved: Iterable<string>) {
  const skip = new Set(reserved);
  return order.filter((id) => !skip.has(id)).slice(0, TOP_ROW_SIZE);
}

/**
 * One page of a reader's feed on Explore. The whole feed is composed (cheap,
 * in memory) and sliced, so pages never repeat each other. `sort` is the
 * Explore top row's order; its series aren't repeated in the shelves.
 */
export async function getFeed(input: {
  readerId: string | null;
  sort: ExploreSort;
  from?: number;
  count?: number;
  pool?: FeedPool;
  now?: number;
}): Promise<FeedPage> {
  const now = input.now ?? Date.now();
  const pool = input.pool ?? (await getFeedPool());
  const signals = input.readerId ? await loadReaderSignals(input.readerId) : null;
  const ctx = shelfContext(pool, signals, now);
  const base = { shelves: pool.shelves, ctx, seed: feedSeed(input.readerId, now), skipRules: ["TRENDING"] as const, now };
  // Today's priority shelves (Continue Reading, Because you liked, New Writers when drawn) keep
  // their series: Explore's top row skips them, so they're never emptied by it and nothing repeats.
  const reservedIds = composeFeed({ ...base, priorityOnly: true }).flatMap((shelf) => shelf.cards.map((card) => card.id));
  const topRow = topRowIds(rankExplore(pool.series, now)[input.sort], reservedIds);
  const all = composeFeed({ ...base, alreadyShown: topRow });
  const from = Math.max(0, input.from ?? 0);
  const count = input.count ?? (from === 0 ? FEED_FIRST_LOAD : FEED_LOAD_MORE);
  const shelves = all.slice(from, from + count);
  const byId = new Map(pool.series.map((series) => [series.id, series]));
  return {
    shelves,
    next: from + count < all.length ? from + count : null,
    newWriterAuthorIds: shelves
      .filter((shelf) => shelf.rule === "NEW_WRITERS")
      .flatMap((shelf) => shelf.cards.map((card) => byId.get(card.id)?.authorId))
      .filter((id): id is string => Boolean(id)),
    reservedIds,
  };
}
