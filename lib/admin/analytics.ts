import { prisma } from "@/lib/prisma";
import { PUBLIC_EPISODE_WHERE, PUBLIC_SERIES_WHERE } from "@/lib/content-visibility";

/*
 * Site-wide analytics for Administration, from real records only. Read
 * figures follow lib/read-tracking.ts:
 *   - ReadEvent: signed-in readers only, at most one per reader per episode
 *     per 24 hours, never an author reading their own work.
 *   - Episode.readerCount / Series.reads: distinct (reader, episode) pairs.
 * Each figure is its own query against one table (no joins that could
 * multiply rows). Page views of the site, series pages and episode pages are
 * NOT tracked anywhere, so they are reported as unavailable.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getSiteAnalytics() {
  const since30 = new Date(Date.now() - 30 * DAY_MS);

  const [
    roleGroups,
    publishedSeries,
    publishedEpisodes,
    readEventsTotal,
    readEvents30,
    distinctReaders,
    distinctReaders30,
    uniquePairs,
    topSeries,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    prisma.series.count({ where: PUBLIC_SERIES_WHERE }),
    prisma.episode.count({ where: PUBLIC_EPISODE_WHERE }),
    prisma.readEvent.count(),
    prisma.readEvent.count({ where: { createdAt: { gte: since30 } } }),
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(DISTINCT "userId") AS count FROM "ReadEvent" WHERE "userId" IS NOT NULL`,
    prisma.$queryRaw<{ count: bigint }[]>`SELECT COUNT(DISTINCT "userId") AS count FROM "ReadEvent" WHERE "userId" IS NOT NULL AND "createdAt" >= ${since30}`,
    prisma.episode.aggregate({ _sum: { readerCount: true } }),
    prisma.series.findMany({
      where: PUBLIC_SERIES_WHERE,
      orderBy: [{ reads: "desc" }, { title: "asc" }],
      take: 5,
      select: { id: true, title: true, reads: true },
    }),
  ]);

  const accounts = { READER: 0, WRITER: 0, BOARD: 0, CEO: 0 };
  for (const group of roleGroups) accounts[group.role] = group._count._all;

  return {
    accounts: { ...accounts, total: accounts.READER + accounts.WRITER + accounts.BOARD + accounts.CEO },
    content: { publishedSeries, publishedEpisodes },
    reads: {
      events: readEventsTotal,
      events30: readEvents30,
      uniqueReaders: Number(distinctReaders[0]?.count ?? 0),
      uniqueReaders30: Number(distinctReaders30[0]?.count ?? 0),
      uniqueReaderEpisodePairs: uniquePairs._sum.readerCount ?? 0,
    },
    topSeries,
  };
}
