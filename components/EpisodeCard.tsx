import Link from "next/link";

type EpisodeCardProps = {
  episode: {
    id: string;
    title: string;
    episodeNumber: number;
    teaser?: string | null;
    readTime: number;
    readerCount: number;
  };
};

export default function EpisodeCard({ episode }: EpisodeCardProps) {
  return (
    <Link
      href={`/episode/${episode.id}`}
      className="glass-panel theme-panel-hover block rounded-[24px] border border-[var(--border-color)] p-5 transition hover:opacity-80"
    >
      <p className="eyebrow">Episode {episode.episodeNumber}</p>
      <h3 className="theme-heading mt-3 text-xl font-semibold">{episode.title}</h3>

      <p className="theme-meta mt-3 line-clamp-3 text-sm">
        {episode.teaser || "No teaser available."}
      </p>

      <p className="theme-meta mt-4 font-mono-df text-xs uppercase tracking-[0.24em]">
        {episode.readTime} min read | {episode.readerCount} readers
      </p>
    </Link>
  );
}
