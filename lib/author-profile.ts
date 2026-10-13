import { Prisma } from "@prisma/client";
import {
  ALL_SECTIONS_ON,
  ON_SITE_PREVIEW,
  type AboutCardData,
  type LibraryCardData,
  type LinkData,
  type NormalizedAuthorProfile,
  type OnSiteData,
  type SectionSwitches,
  type SeriesCardInfo,
} from "@/lib/author-profile-rules";
import { PUBLIC_EPISODE_WHERE, PUBLIC_SERIES_WHERE } from "@/lib/content-visibility";
import { seriesRatingSummary } from "@/lib/engagement-rules";
import { prisma } from "@/lib/prisma";
import { deleteReplacedImage, isOwnedImageUrl } from "@/lib/uploads/image-storage";

/*
 * The Writing view of a writer's profile (Sweep 14): loading it for the page
 * and saving the owner's editor document. Server-only. Every function takes
 * the profile owner's id; the save route only ever passes the signed-in
 * member's own id.
 *
 * Page cost: the page's one user query (header + switches + About + Links +
 * On site, 3 of each, with counts) runs in parallel with one SQL query for the
 * Library (cards with each series' pooled rating) and, for the owner only, one
 * for the series they can add.
 */

const BOOK_COVER_PATH = "/images/profile-book-cover/";

export const VISIBLE_EPISODE_WHERE = { ...PUBLIC_EPISODE_WHERE, locked: false } satisfies Prisma.EpisodeWhereInput;

/** Prisma select for the sections, merged into the author page's user query. */
export const writingViewSelect = {
  authorProfile: { select: { id: true, showBio: true, showLibrary: true, showAbout: true, showOnSite: true, showLinks: true } },
  profileAboutCards: { orderBy: { position: "asc" }, select: { id: true, prompt: true, answer: true } },
  profileLinks: { orderBy: { position: "asc" }, select: { id: true, label: true, url: true, subtext: true } },
  _count: { select: { series: { where: PUBLIC_SERIES_WHERE }, episodes: { where: VISIBLE_EPISODE_WHERE } } },
  series: {
    where: PUBLIC_SERIES_WHERE,
    orderBy: { updatedAt: "desc" },
    take: ON_SITE_PREVIEW,
    select: {
      id: true,
      title: true,
      coverImage: true,
      themeColor: true,
      aiUsageTag: true,
      _count: { select: { episodes: { where: { status: "PUBLISHED" } } } },
    },
  },
  episodes: {
    where: VISIBLE_EPISODE_WHERE,
    orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
    take: ON_SITE_PREVIEW,
    select: {
      id: true,
      title: true,
      episodeNumber: true,
      aiUsageTag: true,
      coverImage: true,
      series: { select: { title: true, coverImage: true } },
    },
  },
} satisfies Prisma.UserSelect;

type WritingViewRow = Prisma.UserGetPayload<{ select: typeof writingViewSelect }>;

export function sectionSwitches(row: Pick<WritingViewRow, "authorProfile">): SectionSwitches {
  const profile = row.authorProfile;
  if (!profile) return { ...ALL_SECTIONS_ON };
  return { bio: profile.showBio, library: profile.showLibrary, about: profile.showAbout, onSite: profile.showOnSite, links: profile.showLinks };
}

export function aboutCards(row: Pick<WritingViewRow, "profileAboutCards">): AboutCardData[] {
  return row.profileAboutCards.map((card) => ({ key: card.id, prompt: card.prompt, answer: card.answer }));
}

export function profileLinks(row: Pick<WritingViewRow, "profileLinks">): LinkData[] {
  return row.profileLinks.map((link) => ({ key: link.id, label: link.label, url: link.url, subtext: link.subtext }));
}

export function onSiteData(row: Pick<WritingViewRow, "series" | "episodes" | "_count">): OnSiteData {
  return {
    series: row.series.map((series) => ({
      id: series.id,
      title: series.title,
      coverImage: series.coverImage,
      themeColor: series.themeColor,
      aiUsageTag: String(series.aiUsageTag),
      episodeCount: series._count.episodes,
    })),
    seriesTotal: row._count.series,
    episodes: row.episodes.map((episode) => ({
      id: episode.id,
      title: episode.title,
      episodeNumber: episode.episodeNumber,
      aiUsageTag: String(episode.aiUsageTag),
      seriesTitle: episode.series.title,
      coverImage: episode.coverImage || episode.series.coverImage,
    })),
    episodesTotal: row._count.episodes,
  };
}

type SeriesRow = {
  id: string;
  title: string;
  coverImage: string | null;
  themeColor: string | null;
  aiUsageTag: string;
  status: string;
  ratingAvg: number | null;
  ratingCount: bigint | number;
};

function toSeriesInfo(row: SeriesRow): SeriesCardInfo {
  return {
    id: row.id,
    title: row.title,
    coverImage: row.coverImage,
    themeColor: row.themeColor,
    aiUsageTag: row.aiUsageTag,
    rating: seriesRatingSummary(row.ratingAvg, Number(row.ratingCount)),
    published: row.status === "PUBLISHED",
  };
}

/** Pooled rating of a series' published episodes (same rule as the series page). */
const RATING_JOIN = Prisma.sql`
  LEFT JOIN LATERAL (
    SELECT avg(rt.value) AS avg, count(*) AS count
    FROM "Rating" rt JOIN "Episode" e ON e.id = rt."episodeId"
    WHERE e."seriesId" = s.id AND e.status = 'PUBLISHED'
  ) r ON TRUE`;

type LibraryRow = {
  id: string;
  kind: "BOOK" | "SERIES";
  title: string | null;
  note: string | null;
  url: string | null;
  coverImage: string | null;
  sId: string | null;
  sTitle: string | null;
  sCover: string | null;
  sTheme: string | null;
  sTag: string | null;
  sStatus: string | null;
  ratingAvg: number | null;
  ratingCount: bigint | number | null;
};

/**
 * The Library cards in order, in one query. Visitors never get series that
 * aren't published (the owner sees them, marked); deleted series are already
 * gone with their card (cascade).
 */
export async function getLibraryCards(userId: string, includeUnpublished: boolean): Promise<LibraryCardData[]> {
  const rows = await prisma.$queryRaw<LibraryRow[]>`
    SELECT i.id, i.kind::text AS kind, i.title, i.note, i.url, i."coverImage",
           s.id AS "sId", s.title AS "sTitle", s."coverImage" AS "sCover", s."themeColor" AS "sTheme",
           s."aiUsageTag"::text AS "sTag", s.status::text AS "sStatus",
           r.avg::float AS "ratingAvg", r.count AS "ratingCount"
    FROM "ProfileLibraryItem" i
    LEFT JOIN "Series" s ON s.id = i."seriesId"
    ${RATING_JOIN}
    WHERE i."userId" = ${userId}
    ORDER BY i.position ASC, i."createdAt" ASC`;

  const cards: LibraryCardData[] = [];
  for (const row of rows) {
    if (row.kind === "BOOK") {
      cards.push({ key: row.id, kind: "BOOK", title: row.title ?? "", note: row.note, url: row.url, coverImage: row.coverImage });
      continue;
    }
    if (!row.sId) continue;
    const series = toSeriesInfo({
      id: row.sId,
      title: row.sTitle ?? "",
      coverImage: row.sCover,
      themeColor: row.sTheme,
      aiUsageTag: row.sTag ?? "AI_FREE",
      status: row.sStatus ?? "",
      ratingAvg: row.ratingAvg,
      ratingCount: row.ratingCount ?? 0,
    });
    if (!series.published && !includeUnpublished) continue;
    cards.push({ key: row.id, kind: "SERIES", series });
  }
  return cards;
}

/** The owner's published series, for the editor's "Add a series" picker and preview. */
export async function getSeriesOptions(userId: string): Promise<SeriesCardInfo[]> {
  const rows = await prisma.$queryRaw<SeriesRow[]>`
    SELECT s.id, s.title, s."coverImage", s."themeColor", s."aiUsageTag"::text AS "aiUsageTag", s.status::text AS status,
           r.avg::float AS "ratingAvg", COALESCE(r.count, 0) AS "ratingCount"
    FROM "Series" s
    ${RATING_JOIN}
    WHERE s."authorId" = ${userId} AND s.status = 'PUBLISHED'
    ORDER BY s."updatedAt" DESC
    LIMIT 100`;
  return rows.map(toSeriesInfo);
}

/* ------------------------------------------------------------------ save */

export type SaveResult = { ok: true } | { ok: false; status: number; code: string; message: string };

/**
 * Replaces the owner's sections with the editor document, in one transaction:
 * rows are matched by id (only the owner's own rows), updated, created or
 * deleted, and positions follow the array order. Then book covers that are no
 * longer used are deleted from storage. The document must already be checked
 * by normalizeAuthorProfile and screenProfileContent.
 */
export async function saveAuthorProfile(userId: string, doc: NormalizedAuthorProfile): Promise<SaveResult> {
  const [user, existingItems] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.profileLibraryItem.findMany({ where: { userId }, select: { id: true, seriesId: true, coverImage: true } }),
  ]);
  if (!user) return { ok: false, status: 404, code: "NOT_FOUND", message: "Account not found." };

  // Series: the writer's own; published, or already in their Library (an
  // unpublished one can stay, hidden from visitors, but can't be added).
  const seriesIds = doc.library.flatMap((item) => (item.kind === "SERIES" ? [item.seriesId] : []));
  if (seriesIds.length) {
    const owned = await prisma.series.findMany({
      where: { id: { in: seriesIds }, authorId: userId },
      select: { id: true, status: true },
    });
    const alreadyIn = new Set(existingItems.map((item) => item.seriesId).filter(Boolean));
    const allowed = new Set(owned.filter((series) => series.status === "PUBLISHED" || alreadyIn.has(series.id)).map((series) => series.id));
    if (seriesIds.some((id) => !allowed.has(id))) {
      return { ok: false, status: 400, code: "BAD_SERIES", message: "Only your own published series can be added to your Library." };
    }
  }

  // Covers: kept as stored, or a fresh upload from the book-cover route.
  const storedCovers = new Set(existingItems.map((item) => item.coverImage).filter((url): url is string => Boolean(url)));
  for (const item of doc.library) {
    if (item.kind !== "BOOK" || !item.coverImage || storedCovers.has(item.coverImage)) continue;
    if (!isOwnedImageUrl(item.coverImage) || !new URL(item.coverImage).pathname.startsWith(BOOK_COVER_PATH)) {
      return { ok: false, status: 400, code: "BAD_IMAGE", message: "Use the cover uploader to add a book cover." };
    }
  }

  const itemIds = new Set(existingItems.map((item) => item.id));
  await prisma.$transaction(
    async (tx) => {
      const [aboutIds, linkIds] = await Promise.all([
        tx.profileAboutCard.findMany({ where: { userId }, select: { id: true } }).then((rows) => new Set(rows.map((row) => row.id))),
        tx.profileLink.findMany({ where: { userId }, select: { id: true } }).then((rows) => new Set(rows.map((row) => row.id))),
      ]);
      const keep = <T extends { id?: string }>(items: T[], owned: Set<string>) =>
        items.map((item) => (item.id && owned.has(item.id) ? item.id : null)).filter((id): id is string => Boolean(id));

      await tx.profileLibraryItem.deleteMany({ where: { userId, id: { notIn: keep(doc.library, itemIds) } } });
      await tx.profileAboutCard.deleteMany({ where: { userId, id: { notIn: keep(doc.about, aboutIds) } } });
      await tx.profileLink.deleteMany({ where: { userId, id: { notIn: keep(doc.links, linkIds) } } });

      for (const [position, item] of doc.library.entries()) {
        const data =
          item.kind === "BOOK"
            ? { position, kind: "BOOK" as const, seriesId: null, title: item.title, note: item.note, url: item.url, coverImage: item.coverImage }
            : { position, kind: "SERIES" as const, seriesId: item.seriesId, title: null, note: null, url: null, coverImage: null };
        if (item.id && itemIds.has(item.id)) await tx.profileLibraryItem.update({ where: { id: item.id }, data });
        else await tx.profileLibraryItem.create({ data: { ...data, userId } });
      }
      for (const [position, card] of doc.about.entries()) {
        const data = { position, prompt: card.prompt, answer: card.answer };
        if (card.id && aboutIds.has(card.id)) await tx.profileAboutCard.update({ where: { id: card.id }, data });
        else await tx.profileAboutCard.create({ data: { ...data, userId } });
      }
      for (const [position, link] of doc.links.entries()) {
        const data = { position, label: link.label, url: link.url, subtext: link.subtext };
        if (link.id && linkIds.has(link.id)) await tx.profileLink.update({ where: { id: link.id }, data });
        else await tx.profileLink.create({ data: { ...data, userId } });
      }

      const switches = {
        showBio: doc.sections.bio,
        showLibrary: doc.sections.library,
        showAbout: doc.sections.about,
        showOnSite: doc.sections.onSite,
        showLinks: doc.sections.links,
      };
      await tx.user.update({ where: { id: userId }, data: { bio: doc.bio } });
      await tx.authorProfile.upsert({
        where: { userId },
        update: { ...switches, bio: doc.bio },
        create: { ...switches, userId, bio: doc.bio, displayName: user.name?.trim() || "Writer" },
      });
    },
    { maxWait: 10_000, timeout: 20_000 },
  );

  // Covers no longer on any card (removed or replaced) are deleted.
  const nextCovers = new Set(doc.library.flatMap((item) => (item.kind === "BOOK" && item.coverImage ? [item.coverImage] : [])));
  for (const url of storedCovers) {
    if (!nextCovers.has(url)) await deleteReplacedImage(url, null);
  }
  return { ok: true };
}

/** The editor document as stored (ids included), returned after a save. */
export async function getEditorDocument(userId: string) {
  const [row, library] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        bio: true,
        authorProfile: writingViewSelect.authorProfile,
        profileAboutCards: writingViewSelect.profileAboutCards,
        profileLinks: writingViewSelect.profileLinks,
      },
    }),
    getLibraryCards(userId, true),
  ]);
  return { bio: row.bio ?? "", sections: sectionSwitches(row), library, about: aboutCards(row), links: profileLinks(row) };
}
