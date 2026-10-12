import { PUBLIC_EPISODE_WHERE } from "@/lib/content-visibility";
import { ACTIVITY_PAGE_SIZE } from "@/lib/engagement-rules";
import { prisma } from "@/lib/prisma";

/*
 * A member's Activity: their bookmarks, ratings and comments merged newest
 * first. Only published episodes and visible (not removed) comments appear.
 * Whether others may see it is User.activityVisibility (checked by callers via
 * canViewActivity). Each page reads at most PAGE_SIZE + 1 rows per table.
 */

type EpisodeRef = { id: string; title: string; episodeNumber: number; seriesId: string; seriesTitle: string };

export type ActivityItem =
  | { kind: "bookmark"; key: string; at: string; episode: EpisodeRef }
  | { kind: "rating"; key: string; at: string; episode: EpisodeRef; value: number }
  | { kind: "comment"; key: string; at: string; episode: EpisodeRef; commentId: string; body: string };

const episodeSelect = {
  id: true,
  title: true,
  episodeNumber: true,
  series: { select: { id: true, title: true } },
} as const;

function ref(episode: { id: string; title: string; episodeNumber: number; series: { id: string; title: string } }): EpisodeRef {
  return {
    id: episode.id,
    title: episode.title,
    episodeNumber: episode.episodeNumber,
    seriesId: episode.series.id,
    seriesTitle: episode.series.title,
  };
}

export function canViewActivity(owner: { id: string; activityVisibility: string }, viewerId: string | null | undefined) {
  return owner.id === viewerId || owner.activityVisibility === "PUBLIC";
}

/** One page of activity. `before` is the previous page's nextCursor (an ISO time). */
export async function listActivity(userId: string, before?: string | null) {
  const parsed = before ? new Date(before) : null;
  const cursor = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  const take = ACTIVITY_PAGE_SIZE + 1;

  const [bookmarks, ratings, comments] = await Promise.all([
    prisma.bookmark.findMany({
      where: { userId, episode: PUBLIC_EPISODE_WHERE, ...(cursor ? { createdAt: { lt: cursor } } : {}) },
      orderBy: { createdAt: "desc" },
      take,
      select: { createdAt: true, episode: { select: episodeSelect } },
    }),
    prisma.rating.findMany({
      where: { userId, episode: PUBLIC_EPISODE_WHERE, ...(cursor ? { updatedAt: { lt: cursor } } : {}) },
      orderBy: { updatedAt: "desc" },
      take,
      select: { updatedAt: true, value: true, episode: { select: episodeSelect } },
    }),
    prisma.comment.findMany({
      where: { userId, removedAt: null, episode: PUBLIC_EPISODE_WHERE, ...(cursor ? { createdAt: { lt: cursor } } : {}) },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, createdAt: true, body: true, episode: { select: episodeSelect } },
    }),
  ]);

  const merged: ActivityItem[] = [
    ...bookmarks.map((row) => ({
      kind: "bookmark" as const,
      key: `bookmark:${row.episode.id}`,
      at: row.createdAt.toISOString(),
      episode: ref(row.episode),
    })),
    ...ratings.map((row) => ({
      kind: "rating" as const,
      key: `rating:${row.episode.id}`,
      at: row.updatedAt.toISOString(),
      episode: ref(row.episode),
      value: row.value,
    })),
    ...comments.map((row) => ({
      kind: "comment" as const,
      key: `comment:${row.id}`,
      at: row.createdAt.toISOString(),
      episode: ref(row.episode),
      commentId: row.id,
      body: row.body,
    })),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.key.localeCompare(b.key)));

  // Cut at the page size, but never between items with the same time (the
  // next page starts strictly before the last time shown).
  let end = Math.min(ACTIVITY_PAGE_SIZE, merged.length);
  while (end > 0 && end < merged.length && merged[end].at === merged[end - 1].at) end++;
  const items = merged.slice(0, end);
  const more = merged.length > end || [bookmarks, ratings, comments].some((rows) => rows.length === take);
  return { items, nextCursor: more && items.length > 0 ? items[items.length - 1].at : null };
}
