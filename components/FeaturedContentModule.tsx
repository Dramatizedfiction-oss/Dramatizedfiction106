import SeriesCard from "@/components/SeriesCard";
import type { AuthorVisibilityTier } from "@/lib/author-tier";
import type { MonetizedUser } from "@/lib/monetization";

type FeaturedItem = {
  id: string;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  genre?: string | null;
  tags?: string[] | null;
  aiUsageTag?: string | null;
  engagementLabel?: string | null;
  author: {
    id?: string;
    name?: string | null;
    tier?: AuthorVisibilityTier | null;
  };
};

export default function FeaturedContentModule({
  featuredStories,
  trendingBanner,
  editorsPicks,
  viewer = null,
}: {
  featuredStories: FeaturedItem[];
  trendingBanner?: FeaturedItem | null;
  editorsPicks: FeaturedItem[];
  viewer?: MonetizedUser | null;
}) {
  return (
    <section className="space-y-6">
      {trendingBanner ? (
        <div className="glass-panel overflow-hidden rounded-[28px] border border-[var(--border-color)] p-6">
          <p className="eyebrow">Trending Banner</p>
          <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
            {trendingBanner.title}
          </h2>
          <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
            {trendingBanner.description || "Platform spotlight for the story leading the conversation right now."}
          </p>
        </div>
      ) : null}

      <div>
        <div className="mb-5">
          <p className="eyebrow">Featured Stories</p>
          <h2 className="font-heading theme-heading mt-2 text-3xl font-semibold">
            Manual spotlight
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {featuredStories.map((story) => (
            <SeriesCard
              key={`featured-${story.id}`}
              viewer={viewer}
              series={{
                id: story.id,
                title: story.title,
                description: story.description,
                coverImage: story.coverImage,
                author: {
                  name: story.author.name,
                  tier: story.author.tier ?? null,
                },
                tags: [
                  ...(story.genre ? [story.genre] : []),
                  ...(story.tags || []).slice(0, 2),
                ],
                aiUsageTag: story.aiUsageTag,
                engagementLabel: story.engagementLabel,
              }}
            />
          ))}
        </div>
      </div>

      <div className="glass-panel rounded-[28px] border border-[var(--border-color)] p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Editor&apos;s Picks</p>
            <h2 className="font-heading theme-heading mt-2 text-3xl font-semibold">
              Manual curation
            </h2>
          </div>
          <span className="rounded-full border border-[var(--border-color)] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--text-secondary)]">
            Placeholder UI
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {editorsPicks.map((story) => (
            <SeriesCard
              key={`pick-${story.id}`}
              viewer={viewer}
              series={{
                id: story.id,
                title: story.title,
                description: story.description,
                coverImage: story.coverImage,
                author: {
                  name: story.author.name,
                  tier: story.author.tier ?? null,
                },
                tags: [
                  ...(story.genre ? [story.genre] : []),
                  ...(story.tags || []).slice(0, 2),
                ],
                aiUsageTag: story.aiUsageTag,
                engagementLabel: story.engagementLabel,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
