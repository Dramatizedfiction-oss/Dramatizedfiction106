import { Prisma } from "@prisma/client";
import { PUBLIC_EPISODE_WHERE, PUBLIC_SERIES_WHERE } from "@/lib/content-visibility";
import { seriesRatingSummary } from "@/lib/engagement-rules";
import { prisma } from "@/lib/prisma";
import { seriesRating } from "@/lib/ratings";
import { continuePoint } from "@/lib/reading-progress-rules";
import { primaryRow, type RowKind } from "@/lib/series-rows-rules";
import { SERIES_TAGS, knownSeriesTags } from "@/lib/series-tags";

/*
 * Data for the series page (app/series/[seriesId]). Server-only. Story text
 * is never loaded here. A signed-out view is ~3 queries (series + episodes,
 * rating, rails); a signed-in view adds one query for the member's follow,
 * bookmarks and progress in this series.
 */

/** Seasons aren't in the data model yet: every episode is season 1. */
export function seasonOf(_episode: { episodeNumber: number }) {
  return 1;
}

export async function getSeriesPage(seriesId: string, viewerId: string | null) {
  const series = await prisma.series.findFirst({
    where: { id: seriesId, ...PUBLIC_SERIES_WHERE },
    select: {
      id: true,
      title: true,
      description: true,
      genre: true,
      tags: true,
      coverImage: true,
      themeColor: true,
      aiUsageTag: true,
      isComplete: true,
      followers: true,
      authorId: true,
      author: { select: { id: true, name: true, image: true, role: true, writerStatus: true } },
      episodes: {
        where: { status: "PUBLISHED" },
        orderBy: { episodeNumber: "asc" },
        select: { id: true, title: true, episodeNumber: true, readTime: true, coverImage: true },
      },
    },
  });
  if (!series) return null;

  const episodeIds = series.episodes.map((episode) => episode.id);
  const [rating, viewer, rails] = await Promise.all([
    seriesRating(series.id),
    viewerId ? viewerState(viewerId, series.id, episodeIds) : null,
    // Rails are extras: if they fail, the page still shows without them.
    getSeriesRows(series, viewerId).catch((error): SeriesRows => {
      console.error("Series rows failed; showing the page without them.", error);
      return { primary: null, byAuthor: [] };
    }),
  ]);

  const progress = new Map((viewer?.progress ?? []).map((row) => [row.episodeId, row.percent]));
  const bookmarked = new Set(viewer?.bookmarks ?? []);
  const episodes = series.episodes.map((episode) => ({
    ...episode,
    season: seasonOf(episode),
    progress: progress.get(episode.id) ?? null,
    bookmarked: bookmarked.has(episode.id),
  }));
  const seasons = [...new Set(episodes.map((episode) => episode.season))].map((number) => ({
    number,
    count: episodes.filter((episode) => episode.season === number).length,
  }));

  return {
    series,
    rating,
    episodes,
    seasons,
    totalMinutes: episodes.reduce((sum, episode) => sum + episode.readTime, 0),
    following: viewer?.following ?? false,
    resume: viewer ? continuePoint(series.episodes, viewer.progress) : null,
    rails,
  };
}

/** The member's follow, bookmarks and progress for this series, in one round trip. */
async function viewerState(userId: string, seriesId: string, episodeIds: string[]) {
  const [follow, bookmarks, progress] = await prisma.$transaction([
    prisma.seriesFollow.findUnique({ where: { userId_seriesId: { userId, seriesId } }, select: { userId: true } }),
    prisma.bookmark.findMany({ where: { userId, episodeId: { in: episodeIds } }, select: { episodeId: true } }),
    prisma.readingProgress.findMany({
      where: { userId, episodeId: { in: episodeIds } },
      select: { episodeId: true, percent: true, updatedAt: true },
    }),
  ]);
  return { following: Boolean(follow), bookmarks: bookmarks.map((row) => row.episodeId), progress };
}

// ------------------------------------------------------------------ rails

export const RAIL_LIMIT = 12;

export type RailCard = {
  id: string;
  title: string;
  coverImage: string | null;
  themeColor: string | null;
  aiUsageTag: string;
  authorName: string | null;
  rating: ReturnType<typeof seriesRatingSummary>;
};

export type SeriesRows = {
  /** Row 1: same genre, else "Like this one", else "More for you" (lib/series-rows-rules.ts). */
  primary: { kind: RowKind; title: string; cards: RailCard[] } | null;
  /** Row 2: the author's other series. */
  byAuthor: RailCard[];
};

/**
 * Which series may appear in any row. The one place to add the mature-content
 * cap and moderation filters (held/removed series) when they exist.
 */
function railVisibility() {
  return Prisma.sql`s.status = 'PUBLISHED'`;
}

type RailRow = {
  rail: "author" | "genre" | "like" | "forYou";
  id: string;
  title: string;
  coverImage: string | null;
  themeColor: string | null;
  aiUsageTag: string;
  authorName: string | null;
  ratingAvg: number | null;
  ratingCount: bigint | number;
};

/**
 * Every candidate row in one SQL round trip (each capped at RAIL_LIMIT, the
 * current series and anything railVisibility() hides excluded), then
 * primaryRow() picks Row 1:
 *   - author:  the author's other series, most recently updated.
 *   - genre:   same genre by other authors, most followed first.
 *   - like:    other authors' series sharing sub tags with this one, most
 *              shared tags first, then followers.
 *   - forYou:  signed in: series the member doesn't follow or write, scored
 *              from their follows, bookmarks and 4+ ratings (+2 a liked
 *              author, +1 per liked series in the same genre, +1 per sub tag
 *              shared with a liked series). Signed out (or no signals): the
 *              most followed series.
 * Sub tags count only when on the fixed list (lib/series-tags.ts).
 */
export async function getSeriesRows(
  current: { id: string; authorId: string; genre: string; tags: string[] },
  viewerId: string | null,
): Promise<SeriesRows> {
  const viewer = viewerId ?? "";
  const tags = knownSeriesTags(current.tags).map((tag) => tag.toLowerCase());
  const known = SERIES_TAGS.map((tag) => tag.toLowerCase());
  const rows = await prisma.$queryRaw<RailRow[]>`
    WITH base AS (
      SELECT s.id, s.title, s."coverImage", s."themeColor", s."aiUsageTag"::text AS "aiUsageTag", s.genre,
             s."authorId", s.followers, s.reads, s."updatedAt", u.name AS "authorName",
             ARRAY(SELECT lower(t) FROM unnest(s.tags) t WHERE lower(t) = ANY(${known}::text[])) AS tags
      FROM "Series" s JOIN "User" u ON u.id = s."authorId"
      WHERE ${railVisibility()} AND s.id <> ${current.id}
    ),
    liked AS (
      SELECT e."seriesId" AS id FROM "Rating" r JOIN "Episode" e ON e.id = r."episodeId" WHERE r."userId" = ${viewer} AND r.value >= 4
      UNION SELECT e."seriesId" FROM "Bookmark" b JOIN "Episode" e ON e.id = b."episodeId" WHERE b."userId" = ${viewer}
      UNION SELECT f."seriesId" FROM "SeriesFollow" f WHERE f."userId" = ${viewer}
    ),
    liked_meta AS (
      SELECT s."authorId", lower(s.genre) AS genre FROM "Series" s WHERE s.id IN (SELECT id FROM liked)
    ),
    liked_tags AS (
      SELECT lower(t) AS tag FROM "Series" s, unnest(s.tags) t WHERE s.id IN (SELECT id FROM liked)
    ),
    personal AS (
      SELECT b.*,
             (CASE WHEN b."authorId" IN (SELECT "authorId" FROM liked_meta) THEN 2 ELSE 0 END
              + (SELECT count(*) FROM liked_meta m WHERE m.genre = lower(b.genre))
              + (SELECT count(*) FROM liked_tags lt WHERE lt.tag = ANY(b.tags))) AS score
      FROM base b
      WHERE ${viewer} <> ''
        AND b."authorId" <> ${viewer}
        AND b.id NOT IN (SELECT f."seriesId" FROM "SeriesFollow" f WHERE f."userId" = ${viewer})
    ),
    picked AS (
      (SELECT 'author' AS rail, b.* FROM base b WHERE b."authorId" = ${current.authorId}
        ORDER BY b."updatedAt" DESC LIMIT ${RAIL_LIMIT})
      UNION ALL
      (SELECT 'genre', b.* FROM base b WHERE lower(b.genre) = lower(${current.genre}) AND b."authorId" <> ${current.authorId}
        ORDER BY b.followers DESC, b.reads DESC LIMIT ${RAIL_LIMIT})
      UNION ALL
      (SELECT 'like', b.* FROM base b
        WHERE b."authorId" <> ${current.authorId} AND b.tags && ${tags}::text[]
        ORDER BY cardinality(ARRAY(SELECT unnest(b.tags) INTERSECT SELECT unnest(${tags}::text[]))) DESC, b.followers DESC
        LIMIT ${RAIL_LIMIT})
      UNION ALL
      (SELECT 'forYou', p.id, p.title, p."coverImage", p."themeColor", p."aiUsageTag", p.genre, p."authorId",
              p.followers, p.reads, p."updatedAt", p."authorName", p.tags
        FROM personal p WHERE p.score > 0
        ORDER BY p.score DESC, p.followers DESC LIMIT ${RAIL_LIMIT})
      UNION ALL
      (SELECT 'popular', b.* FROM base b WHERE b."authorId" <> ${viewer}
        ORDER BY b.followers DESC, b.reads DESC LIMIT ${RAIL_LIMIT})
    )
    SELECT p.rail, p.id, p.title, p."coverImage", p."themeColor", p."aiUsageTag", p."authorName",
           r.avg::float AS "ratingAvg", COALESCE(r.count, 0) AS "ratingCount"
    FROM picked p
    LEFT JOIN LATERAL (
      SELECT avg(rt.value) AS avg, count(*) AS count
      FROM "Rating" rt JOIN "Episode" e ON e.id = rt."episodeId"
      WHERE e."seriesId" = p.id AND e.status = 'PUBLISHED'
    ) r ON TRUE`;

  const toCard = (row: RailRow): RailCard => ({
    id: row.id,
    title: row.title,
    coverImage: row.coverImage,
    themeColor: row.themeColor,
    aiUsageTag: row.aiUsageTag,
    authorName: row.authorName,
    rating: seriesRatingSummary(row.ratingAvg, Number(row.ratingCount)),
  });
  const of = (rail: string) => rows.filter((row) => row.rail === rail).map(toCard);
  const personal = of("forYou");
  return {
    primary: primaryRow({ genre: of("genre"), like: of("like"), forYou: personal.length ? personal : of("popular") }, current.genre),
    byAuthor: of("author"),
  };
}
/** Every published episode of a public series, for the full list page. */
export async function getEpisodeList(seriesId: string, viewerId: string | null) {
  const series = await prisma.series.findFirst({
    where: { id: seriesId, ...PUBLIC_SERIES_WHERE },
    select: {
      id: true,
      title: true,
      coverImage: true,
      themeColor: true,
      episodes: {
        where: PUBLIC_EPISODE_WHERE,
        orderBy: { episodeNumber: "asc" },
        select: { id: true, title: true, episodeNumber: true, readTime: true, coverImage: true },
      },
    },
  });
  if (!series) return null;
  const progress = viewerId
    ? await prisma.readingProgress.findMany({
        where: { userId: viewerId, episodeId: { in: series.episodes.map((episode) => episode.id) } },
        select: { episodeId: true, percent: true },
      })
    : [];
  const byEpisode = new Map(progress.map((row) => [row.episodeId, row.percent]));
  return {
    series,
    episodes: series.episodes.map((episode) => ({ ...episode, season: seasonOf(episode), progress: byEpisode.get(episode.id) ?? null })),
  };
}
