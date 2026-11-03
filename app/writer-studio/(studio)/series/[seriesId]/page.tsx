import Link from "next/link";
import { knownSeriesTags } from "@/lib/series-tags";
import { notFound } from "next/navigation";
import AiTagBanner from "@/components/AiTagBanner";
import EpisodeList from "@/components/writer-studio/episodes/EpisodeList";
import NewEpisodeButton from "@/components/writer-studio/series/NewEpisodeButton";
import SeasonControls from "@/components/writer-studio/series/SeasonControls";
import { AddSeasonButton } from "@/components/writer-studio/series/SeasonSheet";
import SeriesDetailsSheet from "@/components/writer-studio/series/SeriesDetailsSheet";
import StudioEmptyState from "@/components/writer-studio/StudioEmptyState";
import { MAX_SEASONS, displayedSeasonStatus, seasonLabel } from "@/lib/season-rules";
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
      <Link href="/writer-studio/series" className="theme-meta inline-flex min-h-11 items-center text-sm transition hover:text-[var(--text-primary)]">
        ← All series
      </Link>

      <section className="flex flex-col gap-6 rounded-3xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-5 sm:flex-row md:p-6">
        <div className="flex w-32 shrink-0 flex-col items-center self-start">
          <div
            className="relative h-44 w-32 overflow-hidden rounded-xl"
            style={{ background: `linear-gradient(160deg, ${accent}, ${accent}33)` }}
          >
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
          </div>
          <AiTagBanner tag={series.aiUsageTag} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`studio-status ${live ? "studio-status-live" : "studio-status-draft"}`}>
              {live ? "Live" : "Not published yet"}
            </span>
            <span className="text-xs capitalize text-[var(--studio-muted)]">{series.genre}</span>
          </div>
          <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">{series.title}</h2>
          <p className="theme-body mt-3 line-clamp-3 max-w-2xl text-sm leading-6">{series.description}</p>
          <p className="theme-meta mt-3 text-xs">
            {series.seasons.length > 1 ? `${plural(series.seasons.length, "season")} · ` : ""}
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
                isComplete: series.isComplete,
                tags: knownSeriesTags(series.tags),
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

      {series.episodes.length === 0 && series.seasons.length <= 1 ? (
        <section>
          <h3 className="font-heading theme-heading mb-4 text-2xl font-semibold">Episodes</h3>
          <StudioEmptyState
            title="No episodes yet"
            description="Start episode 1. It stays a private draft until you publish it."
            action={<NewEpisodeButton seriesId={series.id} aiUsageTag={series.aiUsageTag} label="Write episode 1" />}
          />
        </section>
      ) : (
        <section aria-labelledby="seasons-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 id="seasons-heading" className="font-heading theme-heading text-2xl font-semibold">
              {series.seasons.length > 1 ? "Seasons" : "Episodes"}
            </h3>
            {series.seasons.length < MAX_SEASONS ? <AddSeasonButton seriesId={series.id} nextNumber={series.seasons.length + 1} /> : null}
          </div>
          <div className="space-y-8">
            {series.seasons.map((season) => (
              <SeasonGroup
                key={season.id}
                seriesId={series.id}
                aiUsageTag={series.aiUsageTag}
                seriesLive={live}
                seriesComplete={series.isComplete}
                seasonIds={series.seasons.map((item) => item.id)}
                showHeader={series.seasons.length > 1}
                season={season}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type HubSeason = NonNullable<Awaited<ReturnType<typeof getSeriesHub>>>["seasons"][number];

/** One season on the Studio series page: its header (title, status, counts, controls), its episodes, and "New episode" for it. */
function SeasonGroup({
  seriesId,
  aiUsageTag,
  seriesLive,
  seriesComplete,
  seasonIds,
  showHeader,
  season,
}: {
  seriesId: string;
  aiUsageTag: string;
  seriesLive: boolean;
  seriesComplete: boolean;
  seasonIds: string[];
  showHeader: boolean;
  season: HubSeason;
}) {
  const live = season.episodes.filter((episode) => episode.status === "PUBLISHED").length;
  const drafts = season.episodes.length - live;
  const complete = displayedSeasonStatus(season.status, seriesComplete) === "COMPLETE";

  return (
    <section aria-label={seasonLabel(season)} className="space-y-3">
      {showHeader ? (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h4 className="font-heading theme-heading break-words text-lg font-semibold">{seasonLabel(season)}</h4>
            <p className="theme-meta mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className={`studio-status ${complete ? "studio-status-live" : "studio-status-draft"}`}>
                {complete ? "Complete" : "Ongoing"}
              </span>
              <span>
                {plural(live, "live episode")} · {plural(drafts, "draft")}
              </span>
              {live === 0 ? <span>Hidden from readers until an episode is published</span> : null}
            </p>
            {season.description ? <p className="theme-body mt-2 line-clamp-2 max-w-2xl text-sm leading-6">{season.description}</p> : null}
          </div>
          <SeasonControls
            seriesId={seriesId}
            seasonIds={seasonIds}
            seriesLive={seriesLive}
            season={{
              id: season.id,
              number: season.number,
              title: season.title,
              description: season.description,
              status: season.status,
              episodeCount: season.episodes.length,
            }}
          />
        </div>
      ) : (
        // One season: the same controls, so a writer can name it or add more.
        <div className="flex justify-end">
          <SeasonControls
            seriesId={seriesId}
            seasonIds={seasonIds}
            seriesLive={seriesLive}
            season={{
              id: season.id,
              number: season.number,
              title: season.title,
              description: season.description,
              status: season.status,
              episodeCount: season.episodes.length,
            }}
          />
        </div>
      )}

      {season.episodes.length > 0 ? (
        <EpisodeList episodes={season.episodes} showSeries={false} />
      ) : (
        <p className="rounded-2xl border border-dashed border-[var(--studio-border)] px-4 py-6 text-center text-sm text-[var(--studio-muted)]">
          No episodes in this season yet.
        </p>
      )}
      <NewEpisodeButton
        seriesId={seriesId}
        seasonId={season.id}
        aiUsageTag={aiUsageTag}
        variant="secondary"
        label={showHeader ? `New episode in Season ${season.number}` : "New episode"}
      />
    </section>
  );
}
