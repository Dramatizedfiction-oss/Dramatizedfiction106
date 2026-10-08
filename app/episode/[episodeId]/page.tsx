import Link from "next/link";
import { getNextEpisode } from "@/lib/nextEpisode";
import { auth } from "@/auth";
import EpisodeTransitionCard from "@/components/EpisodeTransitionCard";
import EpisodeContent from "@/components/episode-content/EpisodeContent";
import EpisodeReadingView from "@/components/episode-content/EpisodeReadingView";
import ReportAiTagButton from "@/components/ReportAiTagButton";
import ReaderChrome from "@/components/ReaderChrome";
import ReadTracker from "@/components/ReadTracker";
import { isPhaseThreeActive } from "@/lib/phases";
import {
  canUserAccessContent,
  createViewerMonetizationState,
  type MonetizedEpisode,
} from "@/lib/monetization";
import { PUBLIC_EPISODE_WHERE } from "@/lib/content-visibility";
import { parseEpisodeHtml } from "@/lib/episode-content";
import { prisma } from "@/lib/prisma";

export default async function EpisodeReaderPage({
  params,
}: {
  params: { episodeId: string };
}) {
  // Only published episodes in published series are ever readable here.
  const episode = await prisma.episode.findFirst({
    where: { id: params.episodeId, ...PUBLIC_EPISODE_WHERE },
    include: {
      series: true,
      author: { select: { id: true, name: true } },
    },
  });

  if (!episode) {
    return (
      <main className="reader-page flex items-center justify-center px-6 py-24">
        <div className="max-w-sm text-center">
          <p className="reader-kicker">Episode not found</p>
          <h1 className="mt-3 font-heading text-3xl font-semibold text-[var(--paper-ink)]">
            This story isn&apos;t available
          </h1>
          <p className="reader-meta mt-3 leading-6">
            It may not be published yet, or the link may be wrong.
          </p>
          <Link href="/explore" className="story-button-primary mt-6 inline-flex">
            Browse stories
          </Link>
        </div>
      </main>
    );
  }

  const session = await auth();
  const viewer = createViewerMonetizationState(session?.user?.id);
  const phaseThreeActive = await isPhaseThreeActive();
  const episodeMonetization: MonetizedEpisode = {
    contentType: "episode",
    seriesId: episode.seriesId,
    id: episode.id,
    isFree: !episode.locked,
    isLocked: episode.locked,
    price: episode.locked ? 2.99 : null,
    creatorId: episode.authorId,
  };
  const accessStatus = canUserAccessContent(viewer, episodeMonetization).accessStatus;
  const canReadEpisode = accessStatus !== "locked";

  // Rendering is read-only. Reader activity is recorded separately via
  // POST /api/reads (lib/read-tracking.ts re-checks every condition).
  const viewerId = session?.user?.id;
  const trackRead =
    canReadEpisode &&
    Boolean(viewerId) &&
    viewerId !== episode.authorId &&
    viewerId !== episode.series.authorId;

  const next = await getNextEpisode(episode.seriesId, episode.episodeNumber);
  const nextEpisodeAccessStatus = next
    ? (() => {
        const nextEpisodeMonetization: MonetizedEpisode = {
          contentType: "episode",
          seriesId: next.seriesId,
          id: next.id,
          isFree: !next.locked,
          isLocked: next.locked,
          price: next.locked ? 2.99 : null,
          creatorId: next.authorId,
        };

        return canUserAccessContent(viewer, nextEpisodeMonetization).accessStatus;
      })()
    : "free";

  const seriesHref = `/series/${episode.seriesId}`;

  return (
    <ReaderChrome backHref={seriesHref} seriesTitle={episode.series.title} episodeTitle={episode.title}>
      {trackRead ? <ReadTracker episodeId={episode.id} /> : null}
      <main className="pb-24">
        <EpisodeReadingView
          seriesTitle={episode.series.title}
          seriesHref={seriesHref}
          authorName={episode.author.name}
          authorHref={`/author/${episode.author.id}`}
          episodeNumber={episode.episodeNumber}
          readTime={episode.readTime}
          title={episode.title}
          aiUsageTag={episode.aiUsageTag}
          contentWarning={episode.contentWarning}
          headerActions={<ReportAiTagButton subject={episode.title} />}
        >
          {canReadEpisode ? (
            <div className="reading-body">
              <EpisodeContent content={parseEpisodeHtml(episode.body)} />
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--paper-rule)] px-6 py-8 text-center">
              <p className="reader-kicker">Not available</p>
              <p className="mt-3 font-heading text-2xl font-semibold text-[var(--paper-ink)]">
                This episode can&apos;t be read right now
              </p>
              {episode.teaser || episode.description ? (
                <p className="reader-meta mx-auto mt-3 max-w-md leading-6">{episode.teaser || episode.description}</p>
              ) : null}
            </div>
          )}

          <footer className="mt-16">
            <div className="reader-ornament" aria-hidden>
              ✦ ✦ ✦
            </div>
            <p className="reader-meta text-center">End of Episode {episode.episodeNumber}</p>
            <div className="mt-10">
              <EpisodeTransitionCard
                currentEpisodeId={episode.id}
                nextEpisode={
                  next ? { id: next.id, title: next.title, episodeNumber: next.episodeNumber } : null
                }
                accessStatus={nextEpisodeAccessStatus}
                phaseThreeActive={phaseThreeActive}
              />
            </div>
            <p className="mt-8 text-center">
              <Link href={seriesHref} className="reader-meta inline-block px-3 py-3 underline-offset-4 hover:text-[var(--paper-ink)] hover:underline">
                Back to {episode.series.title}
              </Link>
            </p>
          </footer>
        </EpisodeReadingView>
      </main>
    </ReaderChrome>
  );
}
