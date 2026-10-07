import { prisma } from "@/lib/prisma";
import { PUBLIC_EPISODE_WHERE } from "@/lib/content-visibility";
import { canUserAccessContent, createViewerMonetizationState } from "@/lib/monetization";

/*
 * Read-tracking policy (v1)
 *
 * - Only signed-in readers are tracked; identity comes from the session.
 *   Anonymous visits are not recorded: ReadEvent has no anonymous-reader
 *   column, so they could not be de-duplicated server-side.
 * - Authors (of the episode or its series) reading their own work are not
 *   recorded.
 * - Only episodes a reader can actually read count: published, in a
 *   published series, and not locked for this viewer.
 * - ReadEvent: at most one per (user, episode) per READ_WINDOW_MS.
 * - Episode.readerCount: distinct readers (incremented on a user's first
 *   ever ReadEvent for that episode).
 * - Series.reads: distinct (reader, episode) pairs across the series
 *   (incremented together with Episode.readerCount).
 * - A read never creates revenue.
 *
 * Each (user, episode) pair is serialized with a transaction-scoped Postgres
 * advisory lock, so concurrent requests cannot double count.
 */

export const READ_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ReadOutcome =
  | { status: "COUNTED"; uniqueReader: boolean }
  | { status: "DUPLICATE" }
  | { status: "SELF_READ" }
  | { status: "NOT_READABLE" };

export async function recordEpisodeRead(userId: string, episodeId: string): Promise<ReadOutcome> {
  const episode = await prisma.episode.findFirst({
    where: { id: episodeId, ...PUBLIC_EPISODE_WHERE },
    select: {
      id: true,
      seriesId: true,
      authorId: true,
      locked: true,
      series: { select: { authorId: true } },
    },
  });

  if (!episode) {
    return { status: "NOT_READABLE" };
  }

  const viewer = createViewerMonetizationState(userId);
  const access = canUserAccessContent(viewer, {
    id: episode.id,
    isFree: !episode.locked,
    isLocked: episode.locked,
    price: null,
    creatorId: episode.authorId,
  });

  if (access.accessStatus === "locked") {
    return { status: "NOT_READABLE" };
  }

  if (episode.authorId === userId || episode.series.authorId === userId) {
    return { status: "SELF_READ" };
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${episode.id}))`;

    const latest = await tx.readEvent.findFirst({
      where: { userId, episodeId: episode.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (latest && Date.now() - latest.createdAt.getTime() < READ_WINDOW_MS) {
      return { status: "DUPLICATE" } as const;
    }

    await tx.readEvent.create({
      data: { userId, episodeId: episode.id },
    });

    const uniqueReader = !latest;

    if (uniqueReader) {
      await tx.episode.update({
        where: { id: episode.id },
        data: { readerCount: { increment: 1 } },
      });
      await tx.series.update({
        where: { id: episode.seriesId },
        data: { reads: { increment: 1 } },
      });
    }

    return { status: "COUNTED", uniqueReader } as const;
  });
}
