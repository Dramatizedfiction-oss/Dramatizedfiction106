import { PUBLIC_EPISODE_WHERE } from "@/lib/content-visibility";
import { BOOKMARK_PAGE_SIZE } from "@/lib/engagement-rules";
import { findPublicEpisode } from "@/lib/engagement";
import { prisma } from "@/lib/prisma";

/*
 * Bookmarks: a member saving an episode to their Bookmarks list. Not a
 * reading position. Both actions are safe to repeat. Bookmarks of episodes
 * that are no longer published are hidden from the list (the row is kept, so
 * they reappear if republished).
 */

/** Bookmark a published episode. Null when it doesn't exist or isn't public. */
export async function addBookmark(userId: string, episodeId: string) {
  const episode = await findPublicEpisode(episodeId);
  if (!episode) return null;
  await prisma.bookmark.createMany({ data: [{ userId, episodeId: episode.id }], skipDuplicates: true });
  return { bookmarked: true as const };
}

/** Allowed even if the episode was unpublished, so members can tidy up. */
export async function removeBookmark(userId: string, episodeId: string) {
  await prisma.bookmark.deleteMany({ where: { userId, episodeId } });
  return { bookmarked: false as const };
}

export async function isBookmarked(userId: string, episodeId: string) {
  const row = await prisma.bookmark.findUnique({
    where: { userId_episodeId: { userId, episodeId } },
    select: { userId: true },
  });
  return Boolean(row);
}

export type BookmarkEntry = {
  episodeId: string;
  episodeTitle: string;
  episodeNumber: number;
  seriesId: string;
  seriesTitle: string;
  coverImage: string | null;
  themeColor: string | null;
  bookmarkedAt: string;
};

/** How many bookmarks the member's list shows (published episodes only). */
export function countBookmarks(userId: string) {
  return prisma.bookmark.count({ where: { userId, episode: PUBLIC_EPISODE_WHERE } });
}

/** A member's bookmarks, newest first, published episodes only. `before` is the previous page's cursor. */
export async function listBookmarks(userId: string, before?: string | null) {
  const cursor = before ? new Date(before) : null;
  const rows = await prisma.bookmark.findMany({
    where: {
      userId,
      episode: PUBLIC_EPISODE_WHERE,
      ...(cursor && !Number.isNaN(cursor.getTime()) ? { createdAt: { lt: cursor } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: BOOKMARK_PAGE_SIZE + 1,
    select: {
      createdAt: true,
      episode: {
        select: {
          id: true,
          title: true,
          episodeNumber: true,
          coverImage: true,
          series: { select: { id: true, title: true, coverImage: true, themeColor: true } },
        },
      },
    },
  });

  const page = rows.slice(0, BOOKMARK_PAGE_SIZE);
  const entries: BookmarkEntry[] = page.map(({ createdAt, episode }) => ({
    episodeId: episode.id,
    episodeTitle: episode.title,
    episodeNumber: episode.episodeNumber,
    seriesId: episode.series.id,
    seriesTitle: episode.series.title,
    coverImage: episode.coverImage ?? episode.series.coverImage,
    themeColor: episode.series.themeColor,
    bookmarkedAt: createdAt.toISOString(),
  }));
  return { bookmarks: entries, nextCursor: rows.length > BOOKMARK_PAGE_SIZE ? entries[entries.length - 1].bookmarkedAt : null };
}
