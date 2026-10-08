import type { EpisodeStatus, Prisma } from "@prisma/client";
import { deserializeAiUsageTag } from "@/lib/ai-usage";
import { analyzeEpisodeHtml, normalizeEpisodeHtml } from "@/lib/episode-content";
import { prisma } from "@/lib/prisma";

/*
 * Server-side reads for the Writer Studio. Every query is scoped to the
 * signed-in writer (`authorId: userId`, with userId taken from the session by
 * the calling page), so another writer's series or episode is simply not
 * found. Writes never happen here: they go through app/api/writer-studio/*.
 * List queries never select episode bodies.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const episodeRowSelect = {
  id: true,
  title: true,
  episodeNumber: true,
  status: true,
  aiUsageTag: true,
  readTime: true,
  readerCount: true,
  updatedAt: true,
  publishedAt: true,
  seriesId: true,
  series: { select: { title: true } },
} satisfies Prisma.EpisodeSelect;

export type StudioEpisodeRow = Prisma.EpisodeGetPayload<{ select: typeof episodeRowSelect }>;

const seriesCardSelect = {
  id: true,
  title: true,
  description: true,
  genre: true,
  coverImage: true,
  themeColor: true,
  status: true,
  aiUsageTag: true,
  reads: true,
  updatedAt: true,
  episodes: { select: { status: true, updatedAt: true } },
} satisfies Prisma.SeriesSelect;

type SeriesCardPayload = Prisma.SeriesGetPayload<{ select: typeof seriesCardSelect }>;

export type StudioSeriesSummary = Omit<SeriesCardPayload, "episodes"> & {
  episodeCount: number;
  draftCount: number;
  liveCount: number;
  lastActivity: Date;
};

function summarizeSeries(series: SeriesCardPayload): StudioSeriesSummary {
  const { episodes, ...rest } = series;
  const liveCount = episodes.filter((episode) => episode.status === "PUBLISHED").length;
  const lastActivity = episodes.reduce(
    (latest, episode) => (episode.updatedAt > latest ? episode.updatedAt : latest),
    series.updatedAt,
  );

  return {
    ...rest,
    episodeCount: episodes.length,
    liveCount,
    draftCount: episodes.length - liveCount,
    lastActivity,
  };
}

const DRAFT_STATUSES: EpisodeStatus[] = ["DRAFT", "REVIEW"];

export type EpisodeFilter = "all" | "draft" | "published";

export function parseEpisodeFilter(value: string | undefined | null): EpisodeFilter {
  const normalized = (value || "").toLowerCase();
  if (normalized === "draft" || normalized === "drafts") return "draft";
  if (normalized === "published" || normalized === "live") return "published";
  return "all";
}

function statusWhere(filter: EpisodeFilter): Prisma.EpisodeWhereInput {
  if (filter === "draft") return { status: { in: DRAFT_STATUSES } };
  if (filter === "published") return { status: "PUBLISHED" };
  return {};
}

export async function getWriterProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, image: true, writerStatus: true },
  });
}

export async function getStudioHome(userId: string) {
  const since30 = new Date(Date.now() - 30 * DAY_MS);

  const [lastEdited, drafts, series, publishedCount, readerTotals, reads30] = await Promise.all([
    prisma.episode.findFirst({
      where: { authorId: userId },
      orderBy: { updatedAt: "desc" },
      select: episodeRowSelect,
    }),
    prisma.episode.findMany({
      where: { authorId: userId, status: { in: DRAFT_STATUSES } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: episodeRowSelect,
    }),
    prisma.series.findMany({
      where: { authorId: userId },
      orderBy: { updatedAt: "desc" },
      select: seriesCardSelect,
    }),
    prisma.episode.count({ where: { authorId: userId, status: "PUBLISHED" } }),
    prisma.episode.aggregate({ where: { authorId: userId }, _sum: { readerCount: true } }),
    prisma.readEvent.count({ where: { episode: { authorId: userId }, createdAt: { gte: since30 } } }),
  ]);

  const summaries = series
    .map(summarizeSeries)
    .sort((left, right) => right.lastActivity.getTime() - left.lastActivity.getTime());

  return {
    lastEdited,
    drafts,
    series: summaries,
    totals: {
      series: summaries.length,
      published: publishedCount,
      readers: readerTotals._sum.readerCount ?? 0,
      reads30,
    },
  };
}

export async function listSeries(userId: string) {
  const series = await prisma.series.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: "desc" },
    select: seriesCardSelect,
  });

  return series
    .map(summarizeSeries)
    .sort((left, right) => right.lastActivity.getTime() - left.lastActivity.getTime());
}

export async function getSeriesHub(userId: string, seriesId: string) {
  const series = await prisma.series.findFirst({
    where: { id: seriesId, authorId: userId },
    select: {
      id: true,
      title: true,
      description: true,
      genre: true,
      coverImage: true,
      themeColor: true,
      status: true,
      aiUsageTag: true,
      reads: true,
      updatedAt: true,
      episodes: {
        orderBy: [{ episodeNumber: "asc" }, { createdAt: "asc" }],
        select: episodeRowSelect,
      },
    },
  });

  if (!series) return null;

  return { ...series, aiUsageTag: deserializeAiUsageTag(series.aiUsageTag) };
}

export const EPISODES_PAGE_SIZE = 30;

export async function listEpisodes(
  userId: string,
  options: { filter: EpisodeFilter; seriesId?: string | null; page: number },
) {
  const where: Prisma.EpisodeWhereInput = {
    authorId: userId,
    ...statusWhere(options.filter),
    ...(options.seriesId ? { seriesId: options.seriesId } : {}),
  };

  const [episodes, total, seriesOptions] = await Promise.all([
    prisma.episode.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (options.page - 1) * EPISODES_PAGE_SIZE,
      take: EPISODES_PAGE_SIZE,
      select: episodeRowSelect,
    }),
    prisma.episode.count({ where }),
    prisma.series.findMany({
      where: { authorId: userId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return { episodes, total, seriesOptions };
}

export async function listSeriesForPicker(userId: string) {
  return prisma.series.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      genre: true,
      coverImage: true,
      themeColor: true,
      aiUsageTag: true,
      _count: { select: { episodes: true } },
    },
  });
}

/** Everything the editor needs, with the body normalized to the content contract. */
export async function getEpisodeForEdit(userId: string, episodeId: string) {
  const episode = await prisma.episode.findFirst({
    where: { id: episodeId, authorId: userId },
    select: {
      id: true,
      title: true,
      episodeNumber: true,
      description: true,
      contentWarning: true,
      coverImage: true,
      body: true,
      status: true,
      aiUsageTag: true,
      lastSavedAt: true,
      publishedAt: true,
      seriesId: true,
      series: { select: { id: true, title: true, themeColor: true } },
    },
  });

  if (!episode) return null;

  return {
    id: episode.id,
    title: episode.title,
    episodeNumber: episode.episodeNumber,
    description: episode.description ?? "",
    contentWarning: episode.contentWarning ?? "",
    coverImage: episode.coverImage ?? "",
    bodyHtml: normalizeEpisodeHtml(episode.body),
    status: episode.status,
    aiUsageTag: deserializeAiUsageTag(episode.aiUsageTag),
    lastSavedAt: episode.lastSavedAt.toISOString(),
    publishedAt: episode.publishedAt?.toISOString() ?? null,
    series: episode.series,
  };
}

export type EditableEpisode = NonNullable<Awaited<ReturnType<typeof getEpisodeForEdit>>>;

/** Owner-only read for preview/publish review: any status, parsed body. */
export async function getEpisodeForReview(userId: string, episodeId: string) {
  const episode = await prisma.episode.findFirst({
    where: { id: episodeId, authorId: userId },
    select: {
      id: true,
      title: true,
      episodeNumber: true,
      description: true,
      contentWarning: true,
      coverImage: true,
      body: true,
      status: true,
      aiUsageTag: true,
      readTime: true,
      publishedAt: true,
      lastSavedAt: true,
      series: { select: { id: true, title: true, status: true, themeColor: true } },
    },
  });

  if (!episode) return null;

  const { body, ...rest } = episode;
  return { ...rest, content: analyzeEpisodeHtml(body) };
}

export async function getStudioStats(userId: string) {
  const now = Date.now();
  const since7 = new Date(now - 7 * DAY_MS);
  const since30 = new Date(now - 30 * DAY_MS);

  const [series, episodes, reads7, reads30, perEpisode30] = await Promise.all([
    prisma.series.findMany({
      where: { authorId: userId },
      orderBy: { reads: "desc" },
      select: { id: true, title: true, status: true, reads: true },
    }),
    prisma.episode.findMany({
      where: { authorId: userId, status: "PUBLISHED" },
      orderBy: [{ readerCount: "desc" }, { publishedAt: "desc" }],
      select: {
        id: true,
        title: true,
        episodeNumber: true,
        readerCount: true,
        publishedAt: true,
        seriesId: true,
        series: { select: { title: true } },
      },
    }),
    prisma.readEvent.count({ where: { episode: { authorId: userId }, createdAt: { gte: since7 } } }),
    prisma.readEvent.count({ where: { episode: { authorId: userId }, createdAt: { gte: since30 } } }),
    prisma.readEvent.groupBy({
      by: ["episodeId"],
      where: { episode: { authorId: userId }, createdAt: { gte: since30 } },
      _count: { _all: true },
    }),
  ]);

  const reads30ByEpisode = new Map(perEpisode30.map((row) => [row.episodeId, row._count._all]));

  return {
    series,
    episodes: episodes.map((episode) => ({
      ...episode,
      reads30: reads30ByEpisode.get(episode.id) ?? 0,
    })),
    totals: {
      readers: episodes.reduce((sum, episode) => sum + episode.readerCount, 0),
      reads7,
      reads30,
      published: episodes.length,
      lastPublishedAt: episodes.reduce<Date | null>(
        (latest, episode) =>
          episode.publishedAt && (!latest || episode.publishedAt > latest) ? episode.publishedAt : latest,
        null,
      ),
    },
  };
}
