import Link from "next/link";
import { auth } from "@/auth";
import AiUsageBadge from "@/components/AiUsageBadge";
import AuthorTierBadge from "@/components/AuthorTierBadge";
import EpisodeCarousel from "@/components/EpisodeCarousel";
import FollowAuthorButton from "@/components/follow/FollowAuthorButton";
import PurchasePreviewCard from "@/components/monetization/PurchasePreviewCard";
import SubscriptionPreviewCard from "@/components/monetization/SubscriptionPreviewCard";
import ReportAiTagButton from "@/components/ReportAiTagButton";
import { deriveAuthorTier, derivePostingConsistency } from "@/lib/author-tier";
import {
  canUserAccessContent,
  createViewerMonetizationState,
  type MonetizedSeries,
} from "@/lib/monetization";
import { prisma } from "@/lib/prisma";

export default async function SeriesPage({
  params,
}: {
  params: { seriesId: string };
}) {
  const session = await auth();
  const series = await prisma.series.findFirst({
    where: { id: params.seriesId, status: "PUBLISHED" },
    include: {
      author: {
        select: {
          name: true,
        },
      },
      episodes: {
        where: { status: "PUBLISHED" },
        orderBy: { episodeNumber: "asc" },
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
  const seriesMonetization: MonetizedSeries = {
    contentType: "series",
    id: series.id,
    isFree: true,
    isLocked: false,
    price: 9.99,
    creatorId: series.authorId,
  };
  const seriesAccessStatus = canUserAccessContent(viewer, seriesMonetization).accessStatus;

  return (
    <main className="overflow-hidden px-4 py-6 md:px-6 lg:px-8">
      <section className="rounded-[32px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:p-8">
        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-primary)]">
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

          <div className="flex flex-col justify-center">
            <p className="eyebrow">{series.genre}</p>
            <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold md:text-6xl">
              {series.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="theme-meta text-sm md:text-base">
                By {series.author.name || "Anonymous Author"} | Rating placeholder: 4.8/5
              </p>
              <AuthorTierBadge tier={authorTier} />
              <FollowAuthorButton
                authorId={series.authorId}
                authorName={series.author.name || "Anonymous Author"}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <AiUsageBadge tag={series.aiUsageTag} />
              <ReportAiTagButton subject={series.title} />
            </div>
            <p className="theme-body mt-6 max-w-3xl text-base leading-7 md:text-lg">
              {series.description}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <select
                className="rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                aria-label="Choose season"
                defaultValue="Season 1"
              >
                <option>Season 1</option>
              </select>

              {series.episodes[0] && (
                <Link
                  href={`/episode/${series.episodes[0].id}`}
                  className="story-button-primary"
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
            teaser: episode.teaser,
            body: episode.body,
            aiUsageTag: episode.aiUsageTag,
            readTime: episode.readTime,
            readerCount: episode.readerCount,
            monetization: {
              contentType: "episode",
              seriesId: series.id,
              id: episode.id,
              isFree: !episode.locked,
              isLocked: episode.locked,
              price: episode.locked ? 2.99 : null,
              creatorId: series.authorId,
            },
          }))}
        />
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-2">
        <SubscriptionPreviewCard user={viewer} />
        <PurchasePreviewCard
          contentType="series"
          accessStatus={seriesAccessStatus}
          price={9.99}
        />
      </section>
    </main>
  );
}
