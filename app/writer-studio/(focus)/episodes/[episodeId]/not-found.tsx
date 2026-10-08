import Link from "next/link";

export default function EpisodeNotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <p className="font-heading theme-heading text-2xl font-semibold">Episode not found</p>
      <p className="theme-meta mt-3 text-sm leading-6">
        It may have been removed, or it belongs to another writer.
      </p>
      <Link href="/writer-studio/episodes" className="story-button-secondary mt-6">
        Back to your episodes
      </Link>
    </div>
  );
}
