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
      className="glass-panel block rounded-[24px] border p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
    >
      <p className="eyebrow">Episode {episode.episodeNumber}</p>
      <h3 className="mt-3 text-xl font-semibold text-white">{episode.title}</h3>

      <p className="mt-3 line-clamp-3 text-sm text-slate-400">
        {episode.teaser || "No teaser available."}
      </p>

      <p className="mt-4 font-mono-df text-xs uppercase tracking-[0.24em] text-white/35">
        {episode.readTime} min read | {episode.readerCount} readers
      </p>
    </Link>
  );
}
