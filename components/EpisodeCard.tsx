import Link from "next/link";

export default function EpisodeCard({ episode }) {
  return (
    <Link
      href={`/episode/${episode.id}`}
      className="block bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-600 transition"
    >
      <h3 className="text-lg font-semibold">
        Episode {episode.episodeNumber}: {episode.title}
      </h3>

      <p className="text-slate-400 text-sm line-clamp-2 mt-1">
        {episode.teaser || "No teaser available."}
      </p>

      <p className="text-slate-500 text-xs mt-2">
        {episode.readTime} min read • {episode.readerCount} readers
      </p>
    </Link>
  );
}
