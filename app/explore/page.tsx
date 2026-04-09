import { prisma } from "@/lib/prisma";
import Carousel from "@/components/Carousel";

export default async function ExplorePage() {
  // Trending series (most views)
  const trending = await prisma.series.findMany({
    orderBy: { views: "desc" },
    take: 10
  });

  // New releases (newest first)
  const newReleases = await prisma.series.findMany({
    orderBy: { createdAt: "desc" },
    take: 10
  });

  // Top rated (if you add ratings later)
  const topRated = await prisma.series.findMany({
    orderBy: { rating: "desc" },
    take: 10
  });

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-12">
      <h1 className="text-4xl font-bold mb-6">Explore</h1>

      <Carousel title="Trending Now" items={trending} />
      <Carousel title="New Releases" items={newReleases} />
      <Carousel title="Top Rated" items={topRated} />
    </main>
  );
}
