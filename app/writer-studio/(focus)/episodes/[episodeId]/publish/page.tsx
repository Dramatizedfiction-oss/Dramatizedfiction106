import { notFound } from "next/navigation";
import PublishReview from "@/components/writer-studio/publish/PublishReview";
import { deserializeAiUsageTag } from "@/lib/ai-usage";
import { excerptText } from "@/lib/episode-content";
import { UNTITLED_EPISODE } from "@/lib/writer-studio/format";
import { getEpisodeForReview } from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";

export const metadata = { robots: { index: false, follow: false } };

export default async function PublishEpisodePage({ params }: { params: { episodeId: string } }) {
  const user = await requireStudioUser();
  const episode = await getEpisodeForReview(user.id, params.episodeId);

  if (!episode) notFound();

  return (
    <PublishReview
      episode={{
        id: episode.id,
        title: episode.title === UNTITLED_EPISODE ? "" : episode.title,
        description: episode.description ?? "",
        contentWarning: episode.contentWarning ?? "",
        coverImage: episode.coverImage ?? "",
        aiUsageTag: deserializeAiUsageTag(episode.aiUsageTag),
        episodeNumber: episode.episodeNumber,
        live: episode.status === "PUBLISHED",
        wordCount: episode.content.wordCount,
        readTime: episode.content.readTime,
        opening: excerptText(episode.content.text, 70),
      }}
      series={{
        id: episode.series.id,
        title: episode.series.title,
        live: episode.series.status === "PUBLISHED",
      }}
    />
  );
}
