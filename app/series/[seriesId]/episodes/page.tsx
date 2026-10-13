import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import CoverImage from "@/components/series/CoverImage";
import PlaceholderArt from "@/components/series/PlaceholderArt";
import { coverThumbUrl } from "@/lib/cover-thumbs";
import { seriesAccentStyle } from "@/lib/series-accent";
import { getEpisodeList } from "@/lib/series-page";

/** Every published episode of a series as a vertical list ("See all" from the series page). */
export default async function SeriesEpisodesPage({ params }: { params: { seriesId: string } }) {
  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const data = await getEpisodeList(params.seriesId, viewerId);
  if (!data) notFound();
  const { series, episodes } = data;
  const multiSeason = new Set(episodes.map((episode) => episode.season)).size > 1;

  return (
    <main className="series-accent mx-auto max-w-3xl px-4 pb-16 pt-6 md:px-8" style={seriesAccentStyle(series.themeColor)}>
      <Link
        href={`/series/${series.id}`}
        className="theme-meta -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm transition hover:text-[var(--text-primary)]"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.5 4.5L7 10l5.5 5.5" />
        </svg>
        {series.title}
      </Link>
      <h1 className="font-heading theme-heading mt-1 text-3xl font-semibold">All episodes</h1>
      <p className="theme-meta mt-1 text-sm">
        {episodes.length} {episodes.length === 1 ? "episode" : "episodes"}
      </p>

      <ol className="mt-6 space-y-3">
        {episodes.map((episode) => {
          const label = multiSeason ? `S${episode.season} · E${episode.episodeNumber}` : `E${episode.episodeNumber}`;
          const progress = episode.progress ?? 0;
          return (
            <li key={episode.id}>
              <Link
                href={`/episode/${episode.id}`}
                className="flex items-stretch gap-4 overflow-hidden rounded-[20px] border border-[var(--border-color)] bg-[var(--surface-raised)] p-3 transition hover:border-[var(--border-strong)]"
              >
                <div className="relative aspect-[16/10] w-28 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-primary)] sm:w-36">
                  <CoverImage
                    sources={[coverThumbUrl(episode.coverImage), episode.coverImage, coverThumbUrl(series.coverImage), series.coverImage]}
                    className="absolute inset-0 h-full w-full object-cover"
                    fallback={<PlaceholderArt themeColor={series.themeColor} number={episode.episodeNumber} title="" size="rail" />}
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <p className="theme-meta font-mono-df text-[11px] uppercase tracking-[0.16em]">{label}</p>
                  <p className="theme-heading mt-0.5 line-clamp-2 font-heading text-lg font-semibold leading-snug">{episode.title}</p>
                  <p className="theme-meta mt-0.5 text-sm">
                    {episode.readTime} min read
                    {progress >= 95 ? " · Read" : progress > 0 ? ` · ${progress}%` : ""}
                  </p>
                  {viewerId ? (
                    <div
                      role="progressbar"
                      aria-label={`${label} reading progress`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                      className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--border-color)]"
                    >
                      <div className="h-full bg-[var(--sa)]" style={{ width: `${progress}%` }} />
                    </div>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
