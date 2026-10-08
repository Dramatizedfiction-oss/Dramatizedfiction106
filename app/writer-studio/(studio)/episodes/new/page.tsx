import Link from "next/link";
import SeriesPicker from "@/components/writer-studio/series/SeriesPicker";
import StudioEmptyState from "@/components/writer-studio/StudioEmptyState";
import { deserializeAiUsageTag } from "@/lib/ai-usage";
import { listSeriesForPicker } from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";

export default async function NewEpisodePage() {
  const user = await requireStudioUser();
  const series = await listSeriesForPicker(user.id);

  if (series.length === 0) {
    return (
      <StudioEmptyState
        title="Create a series first"
        description="Every episode belongs to a series. It only takes a moment."
        action={
          <Link href="/writer-studio/series/new" className="story-button-primary">
            Create a series
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="font-heading theme-heading text-3xl font-semibold">Which story are you continuing?</h2>
      <p className="theme-meta mt-2 text-sm">Pick a series and the next episode opens in the editor.</p>
      <div className="mt-6">
        <SeriesPicker
          series={series.map((item) => ({
            id: item.id,
            title: item.title,
            genre: item.genre,
            coverImage: item.coverImage,
            themeColor: item.themeColor,
            aiUsageTag: deserializeAiUsageTag(item.aiUsageTag),
            episodeCount: item._count.episodes,
          }))}
        />
      </div>
      <Link href="/writer-studio/series/new" className="theme-meta mt-6 inline-block text-sm transition hover:text-[var(--text-primary)]">
        Or start a new series →
      </Link>
    </div>
  );
}
