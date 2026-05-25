import Link from "next/link";
import { auth } from "@/auth";
import FeaturedContentModule from "@/components/FeaturedContentModule";
import { buildDiscoveryFeedSections } from "@/lib/discovery-ranking";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const session = await auth();

  const [latestRead, featuredSeries, totalSeries, totalEpisodes, totalAuthors] =
    await Promise.all([
      session?.user?.id
        ? prisma.readEvent.findFirst({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            include: { episode: true },
          })
        : Promise.resolve(null),
      prisma.series.findMany({
        orderBy: [{ reads: "desc" }, { createdAt: "desc" }],
        take: 3,
        include: {
          _count: {
            select: {
              episodes: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              writerStatus: true,
            },
          },
        },
      }),
      prisma.series.count(),
      prisma.episode.count(),
      prisma.user.count({
        where: {
          role: {
            in: ["WRITER", "BOARD", "CEO"],
          },
        },
      }),
    ]);

  const continueEpisode = latestRead?.episode ?? null;
  const homepageDiscovery = buildDiscoveryFeedSections(
    featuredSeries.map((series) => ({
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
        id: series.author.id,
        name: series.author.name,
        writerStatus: series.author.writerStatus,
      },
    })),
  );
  const featuredStories = homepageDiscovery[0]?.items.slice(0, 3) ?? [];

  return (
    <main className="overflow-hidden">
      <section className="relative px-6 py-12 md:px-10 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_30%_at_50%_0%,rgba(124,58,237,0.16),transparent_70%)]" />

        <div className="relative mx-auto max-w-6xl">
          <div className="animate-fade-in-up text-center">
            <div className="relative flex flex-col items-center justify-center pt-10 pb-8 select-none">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(124,58,237,0.12)_0%,transparent_70%)]" />

              <h1
                className="liquid-text font-heading text-center leading-none"
                style={{
                  fontSize: "clamp(3rem, 10vw, 8.5rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                }}
              >
                Dramatized
              </h1>

              <h1
                className="liquid-text font-heading text-center leading-none"
                style={{
                  fontSize: "clamp(3rem, 10vw, 8.5rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                }}
              >
                Fiction
              </h1>

              <p className="theme-meta animate-subtle-pulse mt-5 font-mono-df text-xs uppercase tracking-[0.35em] md:text-sm">
                Stories Performed in Text
              </p>
            </div>

            <p className="theme-body mx-auto mt-4 max-w-3xl text-balance text-lg md:text-xl">
              A premium platform for serialized fiction, immersive reading, and creator-led story worlds.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/explore" className="story-button-primary min-w-[180px]">
                Explore Stories
              </Link>

              <Link href="/become-author" className="story-button-secondary min-w-[220px]">
                Become an Author
              </Link>

              {continueEpisode ? (
                <Link href={`/episode/${continueEpisode.id}`} className="story-button-secondary min-w-[180px]">
                  Continue Reading
                </Link>
              ) : (
                <Link href="/series/new" className="story-button-secondary min-w-[180px]">
                  Start Publishing
                </Link>
              )}
            </div>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <StatCard label="Series Published" value={String(totalSeries)} />
            <StatCard label="Episodes Live" value={String(totalEpisodes)} />
            <StatCard label="Active Creators" value={String(totalAuthors)} />
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--border-color)] px-6 py-12 md:px-10">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="eyebrow">Featured Worlds</p>
            <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold md:text-5xl">
              The front page should feel alive.
            </h2>
            <p className="theme-meta mt-4 max-w-2xl">
              This launch view now uses the Base44-inspired shell you liked: cinematic background, liquid wordmark, glass panels, and stronger content presentation.
            </p>

            <FeaturedContentModule
              featuredStories={featuredStories.map((series) => ({
                ...series,
                author: {
                  id: series.author.id,
                  name: series.author.name,
                  tier: series.authorTier,
                },
              }))}
              trendingBanner={
                featuredStories[0]
                  ? {
                      ...featuredStories[0],
                      author: {
                        id: featuredStories[0].author.id,
                        name: featuredStories[0].author.name,
                        tier: featuredStories[0].authorTier,
                      },
                    }
                  : null
              }
              editorsPicks={featuredStories.map((series) => ({
                ...series,
                author: {
                  id: series.author.id,
                  name: series.author.name,
                  tier: series.authorTier,
                },
              }))}
            />
          </div>

          <div className="space-y-4">
            <div className="glass-panel rounded-[28px] border p-6">
              <p className="eyebrow">Platform Focus</p>
              <h3 className="font-heading theme-heading mt-3 text-3xl font-semibold">
                Phase 1 is about stability and story flow.
              </h3>
              <p className="theme-meta mt-4">
                Reader experience, author publishing, role permissions, and database reliability come first. Monetization stays dormant until you deliberately unlock it.
              </p>
            </div>

            <div className="glass-panel rounded-[28px] border p-6">
              <p className="eyebrow">What Changed</p>
              <ul className="theme-body mt-4 space-y-3 text-sm">
                <li>Premium app shell with a real top nav and sidebar studio layout.</li>
                <li>Animated liquid homepage wordmark inspired directly by your Base44 reference.</li>
                <li>Reusable glass panels and stronger visual hierarchy across launch surfaces.</li>
              </ul>
            </div>

            <div className="glass-panel rounded-[28px] border p-6">
              <p className="eyebrow">For Writers</p>
              <h3 className="font-heading theme-heading mt-3 text-3xl font-semibold">
                Onboarding now has a real home.
              </h3>
              <p className="theme-meta mt-4">
                Start with the shared onboarding article, read the deeper context if you want it, and move into the application step from a cleaner flow.
              </p>
              <Link href="/write-with-us" className="story-button-primary mt-5">
                Open Writer Onboarding
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-panel rounded-[24px] border p-5">
      <p className="eyebrow">{label}</p>
      <p className="font-heading theme-heading mt-3 text-4xl font-semibold">{value}</p>
    </div>
  );
}
