import Link from "next/link";
import EpisodeList from "@/components/writer-studio/episodes/EpisodeList";
import SeriesFilterSelect from "@/components/writer-studio/episodes/SeriesFilterSelect";
import StudioEmptyState from "@/components/writer-studio/StudioEmptyState";
import {
  EPISODES_PAGE_SIZE,
  listEpisodes,
  parseEpisodeFilter,
  type EpisodeFilter,
} from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";

const FILTERS: { value: EpisodeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "published", label: "Live" },
];

function buildHref(params: { status?: EpisodeFilter; series?: string | null; page?: number }) {
  const search = new URLSearchParams();
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.series) search.set("series", params.series);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return `/writer-studio/episodes${query ? `?${query}` : ""}`;
}

export default async function StudioEpisodesPage({
  searchParams,
}: {
  searchParams?: { status?: string; series?: string; page?: string };
}) {
  const user = await requireStudioUser();
  const filter = parseEpisodeFilter(searchParams?.status);
  const seriesId = searchParams?.series || null;
  const page = Math.max(1, Number.parseInt(searchParams?.page || "1", 10) || 1);
  const { episodes, total, seriesOptions } = await listEpisodes(user.id, { filter, seriesId, page });
  const pageCount = Math.max(1, Math.ceil(total / EPISODES_PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-heading theme-heading text-2xl font-semibold">Episodes</h2>
          <p className="theme-meta mt-1 text-sm">Everything you&apos;ve written, most recently edited first.</p>
        </div>
        <Link href="/writer-studio/episodes/new" className="story-button-primary self-start">
          New episode
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-[var(--studio-border)] p-1" role="group" aria-label="Filter by status">
          {FILTERS.map((option) => (
            <Link
              key={option.value}
              href={buildHref({ status: option.value, series: seriesId })}
              aria-current={filter === option.value ? "page" : undefined}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                filter === option.value
                  ? "bg-[var(--studio-surface)] text-[var(--studio-text)]"
                  : "text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>
        {seriesOptions.length > 1 ? (
          <SeriesFilterSelect options={seriesOptions} value={seriesId} status={filter} />
        ) : null}
      </div>

      {episodes.length > 0 ? (
        <EpisodeList episodes={episodes} />
      ) : (
        <StudioEmptyState
          title={filter === "draft" ? "No drafts" : filter === "published" ? "Nothing live yet" : "No episodes yet"}
          description={
            filter === "published"
              ? "Published episodes appear here."
              : "Pick a series and start writing. Drafts are private until you publish."
          }
          action={
            <Link href="/writer-studio/episodes/new" className="story-button-primary">
              New episode
            </Link>
          }
        />
      )}

      {pageCount > 1 ? (
        <nav aria-label="Pages" className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={buildHref({ status: filter, series: seriesId, page: page - 1 })} className="story-button-secondary px-4 py-2">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="theme-meta">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={buildHref({ status: filter, series: seriesId, page: page + 1 })} className="story-button-secondary px-4 py-2">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
