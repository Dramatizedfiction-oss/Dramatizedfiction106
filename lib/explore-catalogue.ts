import { prisma } from "@/lib/prisma";
import { TRENDING_WINDOW_DAYS, rankExplore, type ExploreSort } from "@/lib/explore-ranking";

/*
 * Explore's data (Sweep B1): every published series with what the cards show
 * and the signals rankExplore() needs, in one SQL round trip, plus both
 * orders. Server-only. Capped at EXPLORE_LIMIT series.
 */

export const EXPLORE_LIMIT = 200;

type Row = {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  genre: string;
  themeColor: string | null;
  authorName: string | null;
  reads: number;
  createdAt: Date;
  firstPublishedAt: Date | null;
  lastPublishedAt: Date | null;
  recentReads: bigint | number;
  newFollows: bigint | number;
  ratingAvg: number | null;
  ratingCount: bigint | number;
};

export async function getExploreCatalogue(): Promise<{ series: Row[]; orders: Record<ExploreSort, string[]> }> {
  const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT s.id, s.title, s.description, s."coverImage", s.genre, s."themeColor", u.name AS "authorName",
           s.reads, s."createdAt",
           ep.first AS "firstPublishedAt", ep.last AS "lastPublishedAt",
           COALESCE(rr.count, 0) AS "recentReads",
           COALESCE(nf.count, 0) AS "newFollows",
           rt.avg::float AS "ratingAvg", COALESCE(rt.count, 0) AS "ratingCount"
    FROM "Series" s
    JOIN "User" u ON u.id = s."authorId"
    LEFT JOIN LATERAL (
      SELECT min(e."publishedAt") AS first, max(e."publishedAt") AS last
      FROM "Episode" e WHERE e."seriesId" = s.id AND e.status = 'PUBLISHED'
    ) ep ON TRUE
    LEFT JOIN LATERAL (
      SELECT count(DISTINCT (r."userId", r."episodeId")) AS count
      FROM "ReadEvent" r JOIN "Episode" e ON e.id = r."episodeId"
      WHERE e."seriesId" = s.id AND r."userId" IS NOT NULL AND r."createdAt" >= ${since}
    ) rr ON TRUE
    LEFT JOIN LATERAL (
      SELECT count(*) AS count FROM "SeriesFollow" f WHERE f."seriesId" = s.id AND f."createdAt" >= ${since}
    ) nf ON TRUE
    LEFT JOIN LATERAL (
      SELECT avg(x.value) AS avg, count(*) AS count
      FROM "Rating" x JOIN "Episode" e ON e.id = x."episodeId"
      WHERE e."seriesId" = s.id AND e.status = 'PUBLISHED'
    ) rt ON TRUE
    WHERE s.status = 'PUBLISHED'
    ORDER BY s.reads DESC, s."updatedAt" DESC
    LIMIT ${EXPLORE_LIMIT}`;

  const series = rows.map((row) => ({
    ...row,
    recentReads: Number(row.recentReads),
    newFollows: Number(row.newFollows),
    ratingCount: Number(row.ratingCount),
  }));
  return { series, orders: rankExplore(series) };
}
