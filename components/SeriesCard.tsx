import StoryCard from "@/components/StoryCard";

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
  };
};

export default function SeriesCard({ series }: SeriesCardProps) {
  return (
    <StoryCard
      story={{
        id: series.id,
        title: series.title,
        description: series.description,
        coverImage: series.coverImage,
        author: series.author ?? null,
        aiUsageTag: series.aiUsageTag ?? null,
      }}
    />
  );
}
