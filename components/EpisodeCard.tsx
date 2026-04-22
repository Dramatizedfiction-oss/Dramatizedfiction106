import Link from "next/link";

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
  };
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

export default function EpisodeCard({ episode }: EpisodeCardProps) {
  const title = episode.title?.trim() || "Untitled Episode";
  const seasonNumber = episode.seasonNumber ?? 1;
  const episodeNumber = episode.episodeNumber ?? 0;
  const teaser = episode.teaser?.trim() || buildFallbackTeaser(episode.body || episode.content);
  const readTime = episode.readTime ?? 0;
  const readerCount = episode.readerCount ?? 0;
  const isRead = Boolean(episode.isRead);

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

      <p className="theme-meta mt-5 font-mono-df text-xs uppercase tracking-[0.24em]">
        {readTime} min read | {readerCount} readers
      </p>
    </Link>
  );
}
