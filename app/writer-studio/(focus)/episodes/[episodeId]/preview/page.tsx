import Link from "next/link";
import { notFound } from "next/navigation";
import EpisodeContent from "@/components/episode-content/EpisodeContent";
import EpisodeReadingView from "@/components/episode-content/EpisodeReadingView";
import { getEpisodeForReview } from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";
import { isLive } from "@/lib/writer-studio/status";

export const metadata = { robots: { index: false, follow: false } };

/*
 * Owner-only preview. Reads the episode by id AND author, in any status, and
 * renders it with the same components as the public reader. It records no
 * read and changes nothing; drafts stay invisible to everyone else because
 * public pages only ever query PUBLIC_EPISODE_WHERE.
 */
export default async function EpisodePreviewPage({ params }: { params: { episodeId: string } }) {
  const user = await requireStudioUser();
  const episode = await getEpisodeForReview(user.id, params.episodeId);

  if (!episode) notFound();

  const live = isLive(episode.status);

  return (
    <div className="reader-page">
      <div className="sticky top-0 z-50 border-b border-[var(--paper-rule)] bg-[var(--header-bg)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-[var(--studio-text)]">
            <span className={`studio-status mr-2 ${live ? "studio-status-live" : "studio-status-warning"}`}>
              {live ? "Live version" : "Draft preview"}
            </span>
            {live ? "This is the saved version readers see." : "Only you can see this. It shows the last saved version."}
          </p>
          <Link href={`/writer-studio/episodes/${episode.id}`} className="story-button-secondary px-4 py-2">
            Back to editor
          </Link>
        </div>
      </div>

      <main className="pb-24">
        <EpisodeReadingView
          seriesTitle={episode.series.title}
          authorName={user.name}
          episodeNumber={episode.episodeNumber}
          readTime={episode.readTime}
          title={episode.title}
          aiUsageTag={episode.aiUsageTag}
          contentWarning={episode.contentWarning}
        >
          {episode.content.document.length > 0 ? (
            <div className="reading-body">
              <EpisodeContent content={episode.content.document} />
            </div>
          ) : (
            <p className="reader-meta text-center">Nothing written yet.</p>
          )}
        </EpisodeReadingView>
      </main>
    </div>
  );
}
