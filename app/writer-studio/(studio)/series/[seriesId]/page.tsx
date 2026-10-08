import Link from "next/link";
import { notFound } from "next/navigation";
import AiUsageBadge from "@/components/AiUsageBadge";
import EpisodeList from "@/components/writer-studio/episodes/EpisodeList";
import NewEpisodeButton from "@/components/writer-studio/series/NewEpisodeButton";
import SeriesDetailsSheet from "@/components/writer-studio/series/SeriesDetailsSheet";
import StudioEmptyState from "@/components/writer-studio/StudioEmptyState";
import { plural, safeHexColor, safeImageUrl } from "@/lib/writer-studio/format";
import { getSeriesHub } from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";

export default async function SeriesHubPage({
  params,
  searchParams,
}: {
  params: { seriesId: string };
  searchParams?: { edit?: string };
}) {
  const user = await requireStudioUser();
  const series = await getSeriesHub(user.id, params.seriesId);

  if (!series) notFound();

  const live = series.status === "PUBLISHED";
  const accent = safeHexColor(series.themeColor);
  const cover = safeImageUrl(series.coverImage);
  const liveCount = series.episodes.filter((episode) => episode.status === "PUBLISHED").length;
  const draftCount = series.episodes.length - liveCount;

  return (
    <div className="space-y-8">
      <Link href="/writer-studio/series" className="theme-meta text-sm transition hover:text-[var(--text-primary)]">
        ← All series
      </Link>

      <section className="flex flex-col gap-6 rounded-3xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-5 sm:flex-row md:p-6">
        <div
          className="relative h-44 w-32 shrink-0 overflow-hidden rounded-xl"
          style={{ background: `linear-gradient(160deg, ${accent}, ${accent}33)` }}
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`studio-status ${live ? "studio-status-live" : "studio-status-draft"}`}>
              {live ? "Live" : "Not published yet"}
            </span>
            <AiUsageBadge tag={series.aiUsageTag} compact />
            <span className="text-xs capitalize text-[var(--studio-muted)]">{series.genre}</span>
          </div>
          <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">{series.title}</h2>
          <p className="theme-body mt-3 line-clamp-3 max-w-2xl text-sm leading-6">{series.description}</p>
          <p className="theme-meta mt-3 text-xs">
            {plural(liveCount, "live episode")} · {plural(draftCount, "draft")}
            {live ? ` · ${plural(series.reads, "read")}` : ""}
          </p>
          {!live ? (
            <p className="theme-meta mt-2 text-xs">Becomes visible to readers when you publish its first episode.</p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-start gap-3">
            <NewEpisodeButton seriesId={series.id} aiUsageTag={series.aiUsageTag} />
            <SeriesDetailsSheet
              seriesId={series.id}
              initiallyOpen={searchParams?.edit === "details"}
              initialValues={{
                title: series.title,
                genre: series.genre,
                description: series.description,
                aiUsageTag: series.aiUsageTag,
                coverImage: series.coverImage ?? "",
                themeColor: series.themeColor ?? "",
              }}
            />
            {live ? (
              <Link href={`/series/${series.id}`} className="story-button-secondary">
                View as reader
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section>
        <h3 className="font-heading theme-heading mb-4 text-2xl font-semibold">Episodes</h3>
        {series.episodes.length > 0 ? (
          <EpisodeList episodes={series.episodes} showSeries={false} />
        ) : (
          <StudioEmptyState
            title="No episodes yet"
            description="Start episode 1. It stays a private draft until you publish it."
            action={<NewEpisodeButton seriesId={series.id} aiUsageTag={series.aiUsageTag} label="Write episode 1" />}
          />
        )}
      </section>
    </div>
  );
}
