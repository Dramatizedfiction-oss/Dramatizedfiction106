import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import EpisodeCard from "@/components/EpisodeCard";

export default async function WriterEpisodesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <p className="theme-meta">You must be logged in.</p>;
  }

  const episodes = await prisma.episode.findMany({
    where: { authorId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Episodes</p>
          <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
            Keep every release intentional
          </h2>
        </div>
        <Link href="/episode/new" className="story-button-primary">
          New Episode
        </Link>
      </div>

      {episodes.length === 0 ? (
        <div className="theme-panel rounded-[24px] border border-dashed border-[var(--border-color)] p-6">
          <p className="theme-meta text-sm">
            You have not published any episodes yet. Teasers and AI usage labels will appear automatically here once you do.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {episodes.map((episode) => (
            <EpisodeCard
              key={episode.id}
              episode={{
                id: episode.id,
                title: episode.title,
                episodeNumber: episode.episodeNumber,
                teaser: episode.teaser,
                body: episode.body,
                readTime: episode.readTime,
                readerCount: episode.readerCount,
                aiUsageTag: episode.aiUsageTag,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
