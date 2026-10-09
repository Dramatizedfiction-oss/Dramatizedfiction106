import { PUBLIC_SERIES_WHERE } from "@/lib/content-visibility";
import { prisma } from "@/lib/prisma";

/*
 * Following a SERIES (separate from following an author, which lives on the
 * author's page). Rows are SeriesFollow; Series.followers is kept equal to the
 * row count by a database trigger, so nothing here writes that column.
 *
 * Both actions are safe to repeat: following twice keeps one row, unfollowing
 * something not followed is a no-op.
 */

/** Follow a published series. Null when the series doesn't exist or isn't public. */
export async function followSeries(userId: string, seriesId: string) {
  const series = await prisma.series.findFirst({
    where: { id: seriesId, ...PUBLIC_SERIES_WHERE },
    select: { id: true },
  });
  if (!series) return null;

  // ON CONFLICT DO NOTHING: a repeat follow inserts nothing (and doesn't count twice).
  await prisma.seriesFollow.createMany({ data: [{ userId, seriesId }], skipDuplicates: true });
  return { following: true as const, followerCount: await followerCount(seriesId) };
}

/** Unfollow. Allowed even if the series was unpublished, so members can tidy up. */
export async function unfollowSeries(userId: string, seriesId: string) {
  await prisma.seriesFollow.deleteMany({ where: { userId, seriesId } });
  return { following: false as const, followerCount: await followerCount(seriesId) };
}

export function followerCount(seriesId: string) {
  return prisma.seriesFollow.count({ where: { seriesId } });
}

export async function isFollowingSeries(userId: string, seriesId: string) {
  const row = await prisma.seriesFollow.findUnique({
    where: { userId_seriesId: { userId, seriesId } },
    select: { userId: true },
  });
  return Boolean(row);
}

export type LibraryEntry = {
  id: string;
  title: string;
  genre: string;
  coverImage: string | null;
  themeColor: string | null;
  authorName: string | null;
  episodeCount: number;
  followedAt: string;
};

/**
 * A member's Library: series they follow, newest follow first. Series that are
 * no longer published are hidden (the follow is kept, so they reappear if
 * republished).
 */
export async function getLibrary(userId: string): Promise<LibraryEntry[]> {
  const rows = await prisma.seriesFollow.findMany({
    where: { userId, series: PUBLIC_SERIES_WHERE },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      series: {
        select: {
          id: true,
          title: true,
          genre: true,
          coverImage: true,
          themeColor: true,
          author: { select: { name: true } },
          _count: { select: { episodes: { where: { status: "PUBLISHED" } } } },
        },
      },
    },
  });

  return rows.map(({ createdAt, series }) => ({
    id: series.id,
    title: series.title,
    genre: series.genre,
    coverImage: series.coverImage,
    themeColor: series.themeColor,
    authorName: series.author.name,
    episodeCount: series._count.episodes,
    followedAt: createdAt.toISOString(),
  }));
}
