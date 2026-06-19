import Link from "next/link";
import { auth } from "@/auth";
import FeaturedContentModule from "@/components/FeaturedContentModule";
import FollowingFeedHint from "@/components/follow/FollowingFeedHint";
import DiscoveryRail from "@/components/DiscoveryRail";
import SeriesCard from "@/components/SeriesCard";
import { buildDiscoveryFeedSections } from "@/lib/discovery-ranking";
import { createViewerMonetizationState } from "@/lib/monetization";
import { prisma } from "@/lib/prisma";
import { isWriter } from "@/lib/roles";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: { q?: string; view?: string };
}) {
  const session = await auth();
  const query = searchParams?.q?.trim() || "";
  const view = searchParams?.view || "explore";
  const viewer = createViewerMonetizationState(session?.user?.id);
  const showBecomeAuthorCta = Boolean(session?.user) && !isWriter(session?.user.role);

  const where = query
    ? {
        status: "PUBLISHED" as const,
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
      where: where ? { ...where, status: "PUBLISHED" } : { status: "PUBLISHED" },
      take: 32,
      include: {
        author: {
          select: {
            id: true,
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
      where: { status: "PUBLISHED" },
      orderBy: [{ reads: "desc" }, { followers: "desc" }, { updatedAt: "desc" }],
      take: 24,
      include: {
        author: {
          select: {
            id: true,
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
      where: { status: "PUBLISHED" },
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
  const featuredStories = discoverySections[0]?.items.slice(0, 3) ?? [];
  const trendingBanner = discoverySections[0]?.items[0] ?? null;
  const editorsPicks = discoverySections[2]?.items.slice(0, 3) ?? featuredStories;

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
            <span className="rounded-full border border-[var(--border-color)] px-4 py-2 text-sm text-[var(--text-secondary)] opacity-80">
              Following
            </span>
          </div>

          {query ? (
            <p className="theme-meta mb-6 text-sm">
              Showing discovery results for "{query}"
            </p>
          ) : null}

          <div className="space-y-10">
            {view === "for-you" ? <FollowingFeedHint /> : null}

            {showBecomeAuthorCta ? (
              <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="eyebrow">Creator Mode</p>
                    <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">
                      Reading first. Creating when you are ready.
                    </h2>
                    <p className="theme-meta mt-3 max-w-2xl text-sm leading-6">
                      Your account starts as a reader profile. Become a writer when you want Writer Studio, creator identity, WIP journeys, and publishing tools.
                    </p>
                  </div>
                  <Link href="/become-author" className="story-button-primary shrink-0 justify-center">
                    Become a Writer
                  </Link>
                </div>
              </section>
            ) : null}

            <FeaturedContentModule
              viewer={viewer}
              featuredStories={featuredStories.map((series) => ({
                ...series,
                author: {
                  id: series.author.id,
                  name: series.author.name,
                  tier: series.authorTier,
                },
              }))}
              trendingBanner={
                trendingBanner
                  ? {
                      ...trendingBanner,
                      author: {
                        id: trendingBanner.author.id,
                        name: trendingBanner.author.name,
                        tier: trendingBanner.authorTier,
                      },
                    }
                  : null
              }
              editorsPicks={editorsPicks.map((series) => ({
                ...series,
                author: {
                  id: series.author.id,
                  name: series.author.name,
                  tier: series.authorTier,
                },
              }))}
            />

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
                          tier: series.authorTier,
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
