import { getNextEpisode } from "@/lib/nextEpisode";
import { auth } from "@/auth";
import AiUsageBadge from "@/components/AiUsageBadge";
import EpisodeTransitionCard from "@/components/EpisodeTransitionCard";
import PurchasePreviewCard from "@/components/monetization/PurchasePreviewCard";
import SubscriptionPreviewCard from "@/components/monetization/SubscriptionPreviewCard";
import ReportAiTagButton from "@/components/ReportAiTagButton";
import ReaderChrome from "@/components/ReaderChrome";
import { isPhaseThreeActive } from "@/lib/phases";
import {
  canUserAccessContent,
  createViewerMonetizationState,
  type MonetizedEpisode,
} from "@/lib/monetization";
import { prisma } from "@/lib/prisma";

export default async function EpisodeReaderPage({
  params,
}: {
  params: { episodeId: string };
}) {
  const episode = await prisma.episode.findFirst({
    where: { id: params.episodeId, status: "PUBLISHED" },
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

  await prisma.episode.update({
    where: { id: params.episodeId },
    data: { readerCount: { increment: 1 } },
  });

  await prisma.series.update({
    where: { id: episode.seriesId },
    data: { reads: { increment: 1 } },
  });

  await prisma.revenueEvent.create({
    data: {
      type: "EPISODE_READ",
      amount: 1,
      userId: session?.user?.id ?? null,
      seriesId: episode.seriesId,
      episodeId: episode.id,
    },
  });

  await prisma.readEvent.create({
    data: {
      userId: session?.user?.id ?? null,
      episodeId: episode.id,
    },
  });

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
      <main className="px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto grid max-w-[1400px] gap-8 lg:grid-cols-[minmax(0,700px)_320px] lg:items-start lg:justify-center">
          <div className="min-w-0">
            <header className="mb-8">
              <p className="eyebrow">
                Episode {episode.episodeNumber} | {episode.readTime} min read
              </p>
              <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold md:text-5xl">
                {episode.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <AiUsageBadge tag={episode.aiUsageTag} />
                <ReportAiTagButton subject={episode.title} />
              </div>
            </header>

            <article className="mx-auto max-w-[700px]">
              <div className="theme-body space-y-6 text-base leading-8 md:text-lg">
                {episode.body
                  .split(/\n\s*\n/)
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={`${episode.id}-${index}`}>{paragraph.trim()}</p>
                  ))}
              </div>
            </article>

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
