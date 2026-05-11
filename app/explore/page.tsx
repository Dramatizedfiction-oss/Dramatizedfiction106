import Link from "next/link";
import { auth } from "@/auth";
import DiscoveryRail from "@/components/DiscoveryRail";
import SeriesCard from "@/components/SeriesCard";
import { buildDiscoveryFeedSections } from "@/lib/discovery-ranking";
import { createViewerMonetizationState } from "@/lib/monetization";
import { prisma } from "@/lib/prisma";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: { q?: string; view?: string };
}) {
  const session = await auth();
  const query = searchParams?.q?.trim() || "";
  const view = searchParams?.view || "explore";
  const viewer = createViewerMonetizationState(session?.user?.id);

  const where = query
    ? {
        OR: [
          { title: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } },
          { genre: { contains: query, mode: "insensitive" as const } },
          { tags: { hasSome: [query] } },
        ],
      }
    : undefined;

  const [stories, fallbackStories, trending] = await Promise.all([
    prisma.series.findMany({
      where,
      take: 32,
      include: {
        author: {
          select: {
            name: true,
            writerStatus: true,
          },
        },
        _count: {
          select: {
            episodes: true,
          },
        },
      },
    }),
    prisma.series.findMany({
      orderBy: [{ reads: "desc" }, { followers: "desc" }, { updatedAt: "desc" }],
      take: 24,
      include: {
        author: {
          select: {
            name: true,
            writerStatus: true,
          },
        },
        _count: {
          select: {
            episodes: true,
          },
        },
      },
    }),
    prisma.series.findMany({
      orderBy: [{ reads: "desc" }, { followers: "desc" }],
      take: 3,
      select: {
        id: true,
        title: true,
        genre: true,
        reads: true,
      },
    }),
  ]);

  const feedSource = stories.length > 0 ? stories : fallbackStories;
  const discoverySections = buildDiscoveryFeedSections(
    feedSource.map((series) => ({
      id: series.id,
      title: series.title,
      description: series.description,
      coverImage: series.coverImage,
      genre: series.genre,
      tags: series.tags,
      reads: series.reads,
      followers: series.followers,
      createdAt: series.createdAt,
      updatedAt: series.updatedAt,
      aiUsageTag: series.aiUsageTag,
      episodeCount: series._count.episodes,
      author: {
        name: series.author.name,
        writerStatus: series.author.writerStatus,
      },
    })),
  );

  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <div className="flex items-start gap-8">
        <section className="min-w-0 flex-1">
          <div className="mb-8">
            <p className="eyebrow">Explore</p>
            <h1 className="font-heading theme-heading mt-3 text-4xl font-semibold md:text-5xl">
              {view === "for-you" ? "For You" : "Discovery Feed"}
            </h1>
            <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
              {view === "for-you"
                ? "A recommendation-flavored view using the same ranking engine while personalization stays lightweight."
                : "Explore 2.0 now organizes the platform around momentum, engagement, freshness, and writer strength."}
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
            <p className="theme-meta mb-6 text-sm">
              Showing discovery results for "{query}"
            </p>
          ) : null}

          <div className="space-y-10">
            {discoverySections.map((section) => (
              <section key={section.key}>
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">{section.title}</p>
                    <h2 className="font-heading theme-heading mt-2 text-3xl font-semibold">
                      {section.title}
                    </h2>
                    <p className="theme-meta mt-2 max-w-2xl text-sm leading-6">
                      {section.description}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {section.items.map((series) => (
                    <SeriesCard
                      key={`${section.key}-${series.id}`}
                      series={{
                        id: series.id,
                        title: series.title,
                        description: series.description,
                        coverImage: series.coverImage,
                        author: {
                          name: series.author.name,
                        },
                        tags: [
                          ...(series.genre ? [series.genre] : []),
                          ...(series.tags || []).slice(0, 2),
                        ],
                        aiUsageTag: series.aiUsageTag,
                        engagementLabel: series.engagementLabel,
                      }}
                      viewer={viewer}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <DiscoveryRail trending={trending} />
      </div>
    </div>
  );
}
