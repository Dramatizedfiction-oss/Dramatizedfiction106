import { getNextEpisode } from "@/lib/nextEpisode";
import { prisma } from "@/lib/prisma";
import { canAccessEpisode } from "@/lib/ads";
import { auth } from "@/lib/auth";

export default async function EpisodeReaderPage({ params }) {
  // Fetch the episode + series
  const episode = await prisma.episode.findUnique({
    where: { id: params.episodeId },
    include: { series: true }
  });

  if (!episode) {
    return <div className="p-8">Episode not found.</div>;
  }

  // Check if user is allowed to read this episode
  const session = await auth();
  const allowed = await canAccessEpisode(
    session?.user?.id || null,
    params.episodeId
  );

  // If NOT allowed → show the locked screen
  if (!allowed) {
    return (
      <main className="p-8 max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Watch Ad to Continue</h1>
        <p className="text-slate-400">
          This episode is locked. Watch an ad to unlock it.
        </p>

        <a
          href={`/watch-ad?episode=${params.episodeId}`}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-semibold inline-block"
        >
          Watch Ad
        </a>
      </main>
    );
  }

  // If allowed → increment reader count
  await prisma.episode.update({
    where: { id: params.episodeId },
    data: { readerCount: { increment: 1 } }
  });

  // Render the episode normally
  return (
    <main className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{episode.title}</h1>
        <p className="text-slate-400">
          Episode {episode.episodeNumber} • {episode.readTime} min read
        </p>
        <p className="text-slate-500 text-sm">
          From: {episode.series.title}
        </p>
      </div>

      <article className="prose prose-invert max-w-none">
        {episode.body}
      </article>
// Fetch next episode
const next = await getNextEpisode(episode.seriesId, episode.episodeNumber);

return (
  <main className="p-8 max-w-3xl mx-auto space-y-8">
    {/* existing episode content */}

    {next && (
      <div className="mt-12 p-6 bg-slate-900 border border-slate-800 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Up Next</h2>
        <p className="text-slate-400 mb-4">{next.title}</p>

        <a
          href={`/episode/${next.id}`}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-semibold inline-block"
        >
          Continue to Episode {next.episodeNumber}
        </a>
      </div>
    )}
  </main>
);
      <div className="pt-10">
        <a
          href={`/series/${episode.seriesId}`}
          className="text-blue-400 hover:underline"
        >
          Back to series
        </a>
      </div>
    </main>
  );
}
