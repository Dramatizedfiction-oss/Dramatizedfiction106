import { NextResponse } from "next/server";
import { PUBLIC_EPISODE_WHERE } from "@/lib/content-visibility";
import { prisma } from "@/lib/prisma";

/*
 * Shared server pieces for bookmarks, ratings and comments: the "episode a
 * reader may act on" lookup and the { error, code } JSON shape for errors the
 * shared apiError() codes don't cover.
 */

export type EngagementFailure = { ok: false; status: number; code: string; message: string };

export const failure = (status: number, code: string, message: string): EngagementFailure => ({
  ok: false,
  status,
  code,
  message,
});

export function failureResponse(result: EngagementFailure) {
  return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });
}

export function isUsableId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 191;
}

/** A published episode in a published series, with who wrote it. Null otherwise. */
export function findPublicEpisode(episodeId: unknown) {
  if (!isUsableId(episodeId)) return Promise.resolve(null);
  return prisma.episode.findFirst({
    where: { id: episodeId, ...PUBLIC_EPISODE_WHERE },
    select: { id: true, authorId: true, locked: true, seriesId: true, series: { select: { authorId: true } } },
  });
}

export type PublicEpisode = NonNullable<Awaited<ReturnType<typeof findPublicEpisode>>>;

/** The series author or the episode's own author: they may not rate it. */
export function isEpisodeCreator(episode: PublicEpisode, userId: string) {
  return episode.authorId === userId || episode.series.authorId === userId;
}
