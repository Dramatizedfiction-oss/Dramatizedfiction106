import { getNextEpisode } from "@/lib/nextEpisode";
import { auth } from "@/auth";
import AiUsageBadge from "@/components/AiUsageBadge";
import EpisodeTransitionCard from "@/components/EpisodeTransitionCard";
import EpisodeContent from "@/components/episode-content/EpisodeContent";
import EpisodeReadingView from "@/components/episode-content/EpisodeReadingView";
import PurchasePreviewCard from "@/components/monetization/PurchasePreviewCard";
import SubscriptionPreviewCard from "@/components/monetization/SubscriptionPreviewCard";
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
  const episode = await prisma.episode.findFirst({
    where: { id: params.episodeId, ...PUBLIC_EPISODE_WHERE },
    include: { series: true },
  });

  if (!episode) {
    return <div className="px-6 py-10">Episode not found.</div>;
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

  const sidebar = (
    <aside className="space-y-4">
      <div className="theme-panel rounded-[28px] border border-[var(--border-color)] p-5">
      <p className="eyebrow">Series Info</p>
      <h2 className="theme-heading mt-3 text-2xl font-semibold">{episode.series.title}</h2>
      <p className="theme-meta mt-3 text-sm leading-6">
        {episode.series.description}
      </p>
      <div className="mt-4">
        <AiUsageBadge tag={episode.aiUsageTag} />
      </div>

      {next && (
        <div className="mt-6">
          <EpisodeTransitionCard
            currentEpisodeId={episode.id}
            nextEpisode={{
              id: next.id,
              title: next.title,
              episodeNumber: next.episodeNumber,
            }}
            user={viewer}
            accessStatus={nextEpisodeAccessStatus}
            phaseThreeActive={phaseThreeActive}
          />
        </div>
      )}
      </div>

      <SubscriptionPreviewCard user={viewer} />
      <PurchasePreviewCard
        contentType="episode"
        accessStatus={accessStatus}
        price={episode.locked ? 2.99 : null}
      />
    </aside>
  );

  return (
    <ReaderChrome
      backHref={`/series/${episode.seriesId}`}
      episodeTitle={episode.title}
    >
      {trackRead ? <ReadTracker episodeId={episode.id} /> : null}
      <main className="editorial-page">
        <div className="mx-auto grid max-w-[1400px] gap-8 lg:grid-cols-[minmax(0,700px)_320px] lg:items-start lg:justify-center">
          <div className="min-w-0">
            <EpisodeReadingView
              episodeNumber={episode.episodeNumber}
              readTime={episode.readTime}
              title={episode.title}
              aiUsageTag={episode.aiUsageTag}
              headerActions={<ReportAiTagButton subject={episode.title} />}
            >
              {canReadEpisode ? (
                <div className="reading-body theme-body">
                  <EpisodeContent content={parseEpisodeHtml(episode.body)} />
                </div>
              ) : (
                <div className="theme-panel rounded-[28px] border border-[var(--border-color)] p-6">
                  <p className="eyebrow">Premium episode</p>
                  <h2 className="theme-heading mt-3 text-2xl font-semibold">Unlock this chapter to keep reading</h2>
                  <p className="theme-meta mt-3 text-sm leading-6">
                    {episode.teaser || episode.description || "This episode is available to subscribers or through an individual unlock."}
                  </p>
                </div>
              )}
            </EpisodeReadingView>

            <div className="mx-auto mt-10 max-w-[700px] lg:hidden">
              <EpisodeTransitionCard
                currentEpisodeId={episode.id}
                nextEpisode={
                  next
                    ? {
                        id: next.id,
                        title: next.title,
                        episodeNumber: next.episodeNumber,
                      }
                    : null
                }
                user={viewer}
                accessStatus={nextEpisodeAccessStatus}
                phaseThreeActive={phaseThreeActive}
              />
            </div>
          </div>

          <div className="hidden lg:block">{sidebar}</div>
        </div>
      </main>
    </ReaderChrome>
  );
}
