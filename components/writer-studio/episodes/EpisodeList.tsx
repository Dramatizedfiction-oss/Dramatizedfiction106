import Link from "next/link";
import AiUsageBadge from "@/components/AiUsageBadge";
import { EyeIcon } from "@/components/icons";
import EpisodeStatusBadge from "@/components/writer-studio/episodes/EpisodeStatusBadge";
import { formatRelative, plural } from "@/lib/writer-studio/format";
import type { StudioEpisodeRow } from "@/lib/writer-studio/queries";
import { isLive } from "@/lib/writer-studio/status";

export default function EpisodeList({
  episodes,
  showSeries = true,
}: {
  episodes: StudioEpisodeRow[];
  showSeries?: boolean;
}) {
  return (
    <ul className="divide-y divide-[var(--studio-border)] overflow-hidden rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)]">
      {episodes.map((episode) => (
        <EpisodeRow key={episode.id} episode={episode} showSeries={showSeries} />
      ))}
    </ul>
  );
}

function EpisodeRow({ episode, showSeries }: { episode: StudioEpisodeRow; showSeries: boolean }) {
  const live = isLive(episode.status);

  return (
    <li className="flex items-center gap-2 pr-2 transition hover:bg-[var(--panel-hover)]">
      <Link
        href={`/writer-studio/episodes/${episode.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-4 sm:gap-4 sm:px-4"
      >
        <span className="w-6 shrink-0 text-center font-mono-df text-xs text-[var(--studio-muted)] sm:w-8">
          {episode.episodeNumber}
        </span>
        <span className="min-w-0 flex-1">
          <span className="theme-heading block truncate text-sm font-semibold">{episode.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--studio-muted)]">
            {showSeries ? <span className="truncate">{episode.series.title}</span> : null}
            <span>Edited {formatRelative(episode.updatedAt)}</span>
            <span>{episode.readTime} min</span>
            {live ? <span>{plural(episode.readerCount, "reader")}</span> : null}
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-2 sm:flex">
          <AiUsageBadge tag={episode.aiUsageTag} compact />
        </span>
        <EpisodeStatusBadge status={episode.status} />
      </Link>
      <Link
        href={`/writer-studio/episodes/${episode.id}/preview`}
        className="studio-tool shrink-0"
        aria-label={`Preview ${episode.title}`}
        title="Preview as a reader"
      >
        <EyeIcon size={16} />
      </Link>
    </li>
  );
}
