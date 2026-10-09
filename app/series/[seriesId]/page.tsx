import Link from "next/link";
import { auth } from "@/auth";
import AiTagBanner from "@/components/AiTagBanner";
import AuthorTierBadge from "@/components/AuthorTierBadge";
import EpisodeCarousel from "@/components/EpisodeCarousel";
import FollowAuthorButton from "@/components/follow/FollowAuthorButton";
import ReportAiTagButton from "@/components/ReportAiTagButton";
import SeasonSelector from "@/components/series/SeasonSelector";
import { deriveAuthorTier, derivePostingConsistency } from "@/lib/author-tier";
import { DEFAULT_SERIES_ACCENT, readableTextOn, seriesAccentHex } from "@/lib/series-color";
import { createViewerMonetizationState } from "@/lib/monetization";
import { PUBLIC_SERIES_WHERE, publicEpisodePreview } from "@/lib/content-visibility";
import { prisma } from "@/lib/prisma";

export default async function SeriesPage({
  params,
}: {
  params: { seriesId: string };
}) {
  const session = await auth();
  const series = await prisma.series.findFirst({
    where: { id: params.seriesId, ...PUBLIC_SERIES_WHERE },
    include: {
      author: {
        select: {
          name: true,
        },
      },
      // Metadata only; `body` is read here solely to build the preview and
      // is never passed to client components.
      episodes: {
        where: { status: "PUBLISHED" },
        orderBy: { episodeNumber: "asc" },
        select: {
          id: true,
          title: true,
          episodeNumber: true,
          teaser: true,
          body: true,
          aiUsageTag: true,
          readTime: true,
          readerCount: true,
          locked: true,
        },
      },
    },
  });

  if (!series) {
    return <div className="px-6 py-10">Series not found.</div>;
  }

  const viewer = createViewerMonetizationState(session?.user?.id);
  const authorTier = deriveAuthorTier({
    totalReads: series.reads,
    engagementRate: Math.min(0.95, (series.followers / Math.max(series.reads, 1)) * 4),
    postingConsistency: derivePostingConsistency(
      series.reads,
      series.episodes.length,
      series.followers,
    ),
    completionRate: Math.min(0.96, 0.45 + Math.min(series.episodes.length, 12) * 0.03),
  });

  // The writer's theme color (Writer Studio → series details). Without a valid
  // one, the genre chip uses the site accent and Start Reading keeps its default.
  const accent = seriesAccentHex(series.themeColor);
  const chipColor = accent ?? DEFAULT_SERIES_ACCENT;
  // The thin border keeps very light or very dark colors visible against either theme.
  const edge = "0 0 0 1px var(--border-strong)";

  return (
    <main className="editorial-page overflow-hidden">
      <section className="reader-paper p-5 sm:p-6 md:p-8">
        <div className="grid gap-6 md:gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Phones: a contained poster so the title and Start Reading stay near the top.
              The AI tag banner hangs from its bottom edge. */}
          <div className="flex flex-col items-center">
            <div className="mx-auto min-h-0 w-full max-w-[160px] flex-1 overflow-hidden rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-primary)] sm:max-w-[260px] md:rounded-[28px] lg:max-w-none">
              {series.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={series.coverImage}
                  alt={series.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="theme-meta flex aspect-[4/5] items-center justify-center px-8 text-center text-xs uppercase tracking-[0.32em]">
                  Series Cover
                </div>
              )}
            </div>
            <AiTagBanner tag={series.aiUsageTag} className="-mt-px" />
          </div>

          <div className="flex flex-col justify-center">
            <p
              className="inline-flex self-start rounded-full px-3 py-1 font-mono-df text-[0.67rem] font-bold uppercase tracking-[0.22em]"
              style={{ backgroundColor: chipColor, color: readableTextOn(chipColor), boxShadow: edge }}
            >
              {series.genre || "Serialized fiction"}
            </p>
            <h1 className="editorial-title theme-heading mt-3 text-balance text-4xl font-semibold md:text-6xl">
              {series.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="theme-meta text-sm md:text-base">
                Written by{" "}
                <Link
                  href={`/author/${series.authorId}`}
                  className="inline-flex min-h-11 items-center font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4 transition hover:decoration-2 focus-visible:decoration-2"
                >
                  {series.author.name || "Anonymous Author"}
                </Link>
              </p>
              <AuthorTierBadge tier={authorTier} />
              <FollowAuthorButton
                authorId={series.authorId}
                authorName={series.author.name || "Anonymous Author"}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ReportAiTagButton subject={series.title} underline />
            </div>
            {/* Below desktop the description follows the actions, so Start Reading is reachable sooner. */}
            <p className="theme-body order-last mt-6 max-w-3xl text-base leading-7 md:text-lg lg:order-none">
              {series.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 lg:mt-8">
              {/* Placeholder: seasons are not in the data model yet. */}
              <SeasonSelector />

              {series.episodes[0] && (
                <Link
                  href={`/episode/${series.episodes[0].id}`}
                  className="story-button-primary min-h-11 w-full sm:w-auto"
                  style={
                    accent
                      ? {
                          background: accent,
                          color: readableTextOn(accent),
                          boxShadow: `${edge}, 0 10px 26px ${accent}4d`,
                        }
                      : undefined
                  }
                >
                  Start Reading
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <EpisodeCarousel
          viewer={viewer}
          episodes={series.episodes.map((episode) => ({
            id: episode.id,
            title: episode.title,
            episodeNumber: episode.episodeNumber,
            teaser: publicEpisodePreview(episode),
            aiUsageTag: episode.aiUsageTag,
            readTime: episode.readTime,
            readerCount: episode.readerCount,
            monetization: {
              contentType: "episode",
              seriesId: series.id,
              id: episode.id,
              isFree: !episode.locked,
              isLocked: episode.locked,
              price: null,
              creatorId: series.authorId,
            },
          }))}
        />
      </section>
    </main>
  );
}
