import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AiTagBanner from "@/components/AiTagBanner";
import { EpisodeRow } from "@/components/author-profile/WritingSections";
import CoverImage from "@/components/series/CoverImage";
import PlaceholderArt from "@/components/series/PlaceholderArt";
import { VISIBLE_EPISODE_WHERE } from "@/lib/author-profile";
import { WORKS_PAGE_SIZE } from "@/lib/author-profile-rules";
import { PUBLIC_SERIES_WHERE } from "@/lib/content-visibility";
import { coverThumbUrl } from "@/lib/cover-thumbs";
import { prisma } from "@/lib/prisma";
import { isWriterRole, profileHref } from "@/lib/profile-links";

export const metadata: Metadata = { title: "Published work" };

/*
 * "See all" from the On site section of a writer's profile: their published
 * series or latest published (unlocked) episodes, 20 per page. Only published
 * content, the same rules as the profile.
 */
export default async function AuthorWorksPage({
  params,
  searchParams,
}: {
  params: { authorId: string };
  searchParams?: { tab?: string; page?: string };
}) {
  const author = await prisma.user.findUnique({ where: { id: params.authorId }, select: { id: true, name: true, role: true } });
  if (!author) notFound();
  if (!isWriterRole(author.role)) redirect(profileHref(author));

  const tab = searchParams?.tab === "episodes" ? "episodes" : "series";
  const page = Math.max(1, Math.min(500, Number.parseInt(searchParams?.page ?? "1", 10) || 1));
  const skip = (page - 1) * WORKS_PAGE_SIZE;
  const name = author.name?.trim() || "This writer";
  const base = `/author/${author.id}/works`;

  const [total, series, episodes] = await Promise.all([
    tab === "series"
      ? prisma.series.count({ where: { ...PUBLIC_SERIES_WHERE, authorId: author.id } })
      : prisma.episode.count({ where: { ...VISIBLE_EPISODE_WHERE, authorId: author.id } }),
    tab === "series"
      ? prisma.series.findMany({
          where: { ...PUBLIC_SERIES_WHERE, authorId: author.id },
          orderBy: { updatedAt: "desc" },
          skip,
          take: WORKS_PAGE_SIZE,
          select: {
            id: true,
            title: true,
            coverImage: true,
            themeColor: true,
            aiUsageTag: true,
            _count: { select: { episodes: { where: { status: "PUBLISHED" } } } },
          },
        })
      : Promise.resolve([]),
    tab === "episodes"
      ? prisma.episode.findMany({
          where: { ...VISIBLE_EPISODE_WHERE, authorId: author.id },
          orderBy: [{ publishedAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
          skip,
          take: WORKS_PAGE_SIZE,
          select: {
            id: true,
            title: true,
            episodeNumber: true,
            aiUsageTag: true,
            coverImage: true,
            series: { select: { title: true, coverImage: true } },
          },
        })
      : Promise.resolve([]),
  ]);
  const pages = Math.max(1, Math.ceil(total / WORKS_PAGE_SIZE));

  return (
    <main className="px-4 py-6 md:px-6 lg:px-8">
      <Link href={`/author/${author.id}`} className="theme-meta inline-flex min-h-11 items-center text-sm font-semibold hover:text-[var(--text-primary)]">
        ‹ {name}
      </Link>
      <h1 className="font-heading theme-heading mt-1 text-3xl font-semibold">On Dramatized Fiction</h1>

      <nav aria-label="Published work" className="mt-5 flex gap-2">
        {(["series", "episodes"] as const).map((key) => (
          <Link
            key={key}
            href={`${base}?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition ${
              tab === key
                ? "border-transparent bg-[var(--text-primary)] text-[var(--bg-secondary)]"
                : "border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--panel-hover)]"
            }`}
          >
            {key === "series" ? "Series" : "Episodes"}
          </Link>
        ))}
      </nav>

      {total === 0 ? (
        <p className="theme-meta mt-8 text-sm">Nothing published here yet.</p>
      ) : tab === "series" ? (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {series.map((item, index) => (
            <li key={item.id} className="min-w-0">
              <Link href={`/series/${item.id}`} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">
                <div className="flex flex-col items-center">
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)]">
                    <CoverImage
                      sources={[coverThumbUrl(item.coverImage), item.coverImage]}
                      className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.02] motion-reduce:transition-none"
                      fallback={<PlaceholderArt themeColor={item.themeColor} number={skip + index + 1} title={item.title} size="rail" />}
                    />
                  </div>
                  <AiTagBanner tag={item.aiUsageTag} className="-mt-px" />
                </div>
                <p className="theme-heading mt-2 line-clamp-2 text-sm font-semibold leading-snug">{item.title}</p>
                <p className="theme-meta mt-0.5 text-xs">
                  {item._count.episodes} episode{item._count.episodes === 1 ? "" : "s"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {episodes.map((episode) => (
            <li key={episode.id} className="min-w-0">
              <EpisodeRow
                episode={{
                  id: episode.id,
                  title: episode.title,
                  episodeNumber: episode.episodeNumber,
                  aiUsageTag: String(episode.aiUsageTag),
                  seriesTitle: episode.series.title,
                  coverImage: episode.coverImage || episode.series.coverImage,
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-between gap-3">
          {page > 1 ? (
            <Link href={`${base}?tab=${tab}&page=${page - 1}`} className="story-button-secondary min-h-11">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="theme-meta text-sm">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={`${base}?tab=${tab}&page=${page + 1}`} className="story-button-secondary min-h-11">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </main>
  );
}
