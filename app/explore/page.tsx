import { prisma } from "@/lib/prisma";
import Carousel from "@/components/Carousel";

export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: { view?: string };
}) {
  // Trending series
  const trending = await prisma.series.findMany({
    orderBy: { reads: "desc" },
    take: 10
  });

  // New releases (newest first)
  const newReleases = await prisma.series.findMany({
    orderBy: { createdAt: "desc" },
    take: 10
  });

  // Most followed
  const topRated = await prisma.series.findMany({
    orderBy: { followers: "desc" },
    take: 10
  });

  const isTrendingView = searchParams?.view === "trending";

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-12">
      <div>
        <p className="eyebrow">Discover</p>
        <h1 className="font-heading mt-3 text-5xl font-semibold text-white">
          {isTrendingView ? "Trending stories" : "Explore"}
        </h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          {isTrendingView
            ? "The most-read stories on the platform right now."
            : "Browse serialized fiction through trending, fresh releases, and audience favorites."}
        </p>
      </div>

      <Carousel title="Trending Now" items={trending} />
      <Carousel title="New Releases" items={newReleases} />
      <Carousel title="Top Rated" items={topRated} />
    </main>
  );
}
