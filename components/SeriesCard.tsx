import StoryCard from "@/components/StoryCard";
import type { AuthorVisibilityTier } from "@/lib/author-tier";
import type { MonetizedSeries, MonetizedUser } from "@/lib/monetization";

type SeriesCardProps = {
  series: {
    id: string;
    title: string;
    description?: string | null;
    coverImage?: string | null;
    aiUsageTag?: string | null;
    author?: {
      name?: string | null;
      tier?: AuthorVisibilityTier | null;
    } | null;
    tags?: string[] | null;
    engagementLabel?: string | null;
    monetization?: Partial<MonetizedSeries>;
  };
  viewer?: MonetizedUser | null;
};

export default function SeriesCard({ series, viewer = null }: SeriesCardProps) {
  return (
    <StoryCard
      story={{
        id: series.id,
        title: series.title,
        description: series.description,
        coverImage: series.coverImage,
        author: series.author ?? null,
        tags: series.tags ?? null,
        aiUsageTag: series.aiUsageTag ?? null,
        engagementLabel: series.engagementLabel ?? null,
        monetization: series.monetization,
      }}
      viewer={viewer}
    />
  );
}
