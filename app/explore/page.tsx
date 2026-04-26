import Link from "next/link";
import DiscoveryRail from "@/components/DiscoveryRail";
import SeriesCard from "@/components/SeriesCard";
import { prisma } from "@/lib/prisma";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: { q?: string; view?: string };
}) {
  const query = searchParams?.q?.trim() || "";
  const view = searchParams?.view || "explore";

  const stories = await prisma.series.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { genre: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy:
      view === "for-you"
        ? [{ followers: "desc" }, { reads: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }, { reads: "desc" }],
    take: 18,
    include: {
      author: {
        select: {
          name: true,
        },
      },
    },
  });

  const trending = await prisma.series.findMany({
    orderBy: [{ reads: "desc" }, { followers: "desc" }],
    take: 3,
    select: {
      id: true,
      title: true,
      genre: true,
      reads: true,
    },
  });

  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <div className="flex items-start gap-8">
        <section className="min-w-0 flex-1">
          <div className="mb-6">
            <p className="eyebrow">Explore</p>
            <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold md:text-5xl">
              {view === "for-you" ? "For You" : "One feed. Better browsing."}
            </h1>
            <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
              {view === "for-you"
                ? "A placeholder recommendation surface for future personalization, still sharing the same clean browsing feed."
                : "Fresh serialized fiction lives in one clear feed now, with discovery links and trending stories moved into the right rail."}
            </p>
          </div>

          <div className="mb-6 flex gap-2 xl:hidden">
            <Link
              href="/explore"
              className={`rounded-full border px-4 py-2 text-sm ${
                view === "for-you"
                  ? "border-[var(--border-color)] text-[var(--text-secondary)]"
                  : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              }`}
            >
              Explore
            </Link>
            <Link
              href="/explore?view=for-you"
              className={`rounded-full border px-4 py-2 text-sm ${
                view === "for-you"
                  ? "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                  : "border-[var(--border-color)] text-[var(--text-secondary)]"
              }`}
            >
              For You
            </Link>
          </div>

          {query ? (
            <p className="theme-meta mb-6 text-sm">Showing results for "{query}"</p>
          ) : null}

          {stories.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {stories.map((series) => (
                <SeriesCard key={series.id} series={series} />
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-[28px] border border-dashed border-[var(--border-color)] p-8 text-center">
              <h2 className="font-heading theme-heading text-2xl font-semibold">
                No stories found
              </h2>
              <p className="theme-meta mt-3 text-sm">
                Try a different search or come back once new stories are published.
              </p>
            </div>
          )}
        </section>

        <DiscoveryRail trending={trending} />
      </div>
    </div>
  );
}
