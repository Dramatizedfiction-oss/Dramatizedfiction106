import Link from "next/link";
import AiUsageBadge from "@/components/AiUsageBadge";
import ContentAccessBadge from "@/components/monetization/ContentAccessBadge";
import ReportAiTagButton from "@/components/ReportAiTagButton";
import {
  canUserAccessContent,
  type MonetizedEpisode,
  type MonetizedUser,
} from "@/lib/monetization";

type EpisodeCardProps = {
  episode: {
    id: string;
    title?: string | null;
    episodeNumber?: number | null;
    seasonNumber?: number | null;
    teaser?: string | null;
    body?: string | null;
    content?: string | null;
    readTime?: number | null;
    readerCount?: number | null;
    isRead?: boolean | null;
    aiUsageTag?: string | null;
    monetization?: Partial<MonetizedEpisode>;
  };
  viewer?: MonetizedUser | null;
};

function buildFallbackTeaser(source?: string | null) {
  if (!source) {
    return "Open this episode to step into the next scene.";
  }

  const cleaned = source.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "Open this episode to step into the next scene.";
  }

  const words = cleaned.split(" ").filter(Boolean);
  const excerpt = words.slice(0, 24).join(" ");
  return words.length > 24 ? `${excerpt}...` : excerpt;
}

export default function EpisodeCard({ episode, viewer = null }: EpisodeCardProps) {
  const title = episode.title?.trim() || "Untitled Episode";
  const seasonNumber = episode.seasonNumber ?? 1;
  const episodeNumber = episode.episodeNumber ?? 0;
  const teaser = episode.teaser?.trim() || buildFallbackTeaser(episode.body || episode.content);
  const readTime = episode.readTime ?? 0;
  const readerCount = episode.readerCount ?? 0;
  const isRead = Boolean(episode.isRead);
  const monetizedContent: MonetizedEpisode = {
    contentType: "episode",
    seriesId: episode.monetization?.seriesId ?? "",
    id: episode.id,
    isFree: episode.monetization?.isFree ?? true,
    isLocked: episode.monetization?.isLocked ?? false,
    price: episode.monetization?.price ?? null,
    creatorId: episode.monetization?.creatorId ?? "",
  };
  const accessStatus = canUserAccessContent(viewer, monetizedContent).accessStatus;
  const locked = accessStatus === "locked";

  return (
    <Link
      href={`/episode/${episode.id}`}
      className="glass-panel block rounded-[24px] border border-[var(--border-color)] p-5 transition-transform duration-200 hover:-translate-y-0.5 hover:opacity-95"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">
            Season {seasonNumber} | Episode {episodeNumber}
          </p>
          <h3 className="theme-heading mt-3 text-xl font-semibold">{title}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ContentAccessBadge accessStatus={accessStatus} />
            <AiUsageBadge tag={episode.aiUsageTag} compact />
          </div>
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
            isRead
              ? "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
              : "border-[var(--border-color)] bg-transparent text-[var(--text-primary)]"
          }`}
        >
          {isRead ? "Read" : "Unread"}
        </span>
      </div>

      <p className="theme-body mt-4 line-clamp-3 text-sm leading-6">
        {teaser}
      </p>

      {locked && (
        <p className="theme-meta mt-3 text-xs uppercase tracking-[0.2em]">
          Lock icon | teaser only {monetizedContent.price !== null ? `| $${monetizedContent.price.toFixed(2)}` : ""}
        </p>
      )}

      <p className="theme-meta mt-5 font-mono-df text-xs uppercase tracking-[0.24em]">
        {readTime} min read | {readerCount} readers
      </p>

      <div className="mt-4 flex justify-end">
        <ReportAiTagButton subject={title} compact />
      </div>
    </Link>
  );
}
