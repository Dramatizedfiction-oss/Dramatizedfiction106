import { prisma } from "@/lib/prisma";
import Carousel from "@/components/Carousel";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
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

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-12">
      <h1 className="text-4xl font-bold mb-6">Explore</h1>

      <Carousel title="Trending Now" items={trending} />
      <Carousel title="New Releases" items={newReleases} />
      <Carousel title="Top Rated" items={topRated} />
    </main>
  );
}
