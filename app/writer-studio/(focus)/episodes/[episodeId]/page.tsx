import { notFound } from "next/navigation";
import EpisodeEditor from "@/components/writer-studio/editor/EpisodeEditor";
import { parseEpisodeHtml } from "@/lib/episode-content";
import { getEpisodeForEdit } from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";

export const metadata = { robots: { index: false, follow: false } };

export default async function EpisodeEditorPage({ params }: { params: { episodeId: string } }) {
  const user = await requireStudioUser();
  const episode = await getEpisodeForEdit(user.id, params.episodeId);

  if (!episode) notFound();

  return <EpisodeEditor episode={episode} initialContent={parseEpisodeHtml(episode.bodyHtml)} />;
}
