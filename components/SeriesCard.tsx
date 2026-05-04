import StoryCard from "@/components/StoryCard";
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
    } | null;
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
        aiUsageTag: series.aiUsageTag ?? null,
        monetization: series.monetization,
      }}
      viewer={viewer}
    />
  );
}
