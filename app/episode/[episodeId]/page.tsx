import Link from "next/link";
import { getNextEpisode } from "@/lib/nextEpisode";
import { auth } from "@/auth";
import { canAccessEpisode } from "@/lib/ads";
import ReaderChrome from "@/components/ReaderChrome";
import { prisma } from "@/lib/prisma";

export default async function EpisodeReaderPage({
  params,
}: {
  params: { episodeId: string };
}) {
  const episode = await prisma.episode.findUnique({
    where: { id: params.episodeId },
    include: { series: true },
  });

  if (!episode) {
    return <div className="px-6 py-10">Episode not found.</div>;
  }

  const session = await auth();
  const allowed = await canAccessEpisode(session?.user?.id || null, params.episodeId);

  if (!allowed) {
    return (
      <main className="mx-auto max-w-xl space-y-6 px-6 py-12">
        <h1 className="font-heading theme-heading text-3xl font-semibold">
          Watch Ad to Continue
        </h1>
        <p className="theme-meta">
          This episode is locked. Watch an ad to unlock it.
        </p>

        <a
          href={`/watch-ad?episode=${params.episodeId}`}
          className="story-button-primary inline-flex"
        >
          Watch Ad
        </a>
      </main>
    );
  }

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

  const sidebar = (
    <aside className="theme-panel rounded-[28px] border border-[var(--border-color)] p-5">
      <p className="eyebrow">Series Info</p>
      <h2 className="theme-heading mt-3 text-2xl font-semibold">{episode.series.title}</h2>
      <p className="theme-meta mt-3 text-sm leading-6">
        {episode.series.description}
      </p>

      {next && (
        <div className="mt-6">
          <p className="eyebrow">Next Episode</p>
          <p className="theme-heading mt-2 font-medium">{next.title}</p>
          <Link href={`/episode/${next.id}`} className="story-button-primary mt-4 inline-flex">
            Continue to Episode {next.episodeNumber}
          </Link>
        </div>
      )}
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
          </div>

          <div className="hidden lg:block">{sidebar}</div>
        </div>

        <div className="mx-auto mt-8 max-w-[700px] lg:hidden">{sidebar}</div>
      </main>
    </ReaderChrome>
  );
}
