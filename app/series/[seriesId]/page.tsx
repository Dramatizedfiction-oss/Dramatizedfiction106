import { prisma } from "@/lib/prisma";
import EpisodeCard from "@/components/EpisodeCard";
import type { Episode } from "@prisma/client";

export default async function SeriesPage({
  params,
}: {
  params: { seriesId: string };
}) {
  const series = await prisma.series.findUnique({
    where: { id: params.seriesId },
    include: { episodes: { orderBy: { episodeNumber: "asc" } } }
  });

  if (!series) {
    return <div className="p-8">Series not found.</div>;
  }

  return (
    <main className="p-8 space-y-6">
      <div className="flex gap-6">
        <div className="w-48 h-64 bg-slate-800 rounded-lg overflow-hidden">
          {series.coverImage ? (
            <img
              src={series.coverImage}
              alt={series.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              No Cover
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{series.title}</h1>
          <p className="text-slate-300">{series.description}</p>
          <p className="text-slate-500 text-sm">
            {series.genre} • {series.episodes.length} episodes
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {series.episodes.map((ep: Episode) => (
          <EpisodeCard key={ep.id} episode={ep} />
        ))}
      </div>
    </main>
  );
}
