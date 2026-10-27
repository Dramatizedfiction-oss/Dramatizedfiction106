import { redirect } from "next/navigation";

// Publishing is step 2 of the editor since Sweep F; old links land there.
// The editor page does the owner check.
export default function PublishEpisodePage({ params }: { params: { episodeId: string } }) {
  redirect(`/writer-studio/episodes/${encodeURIComponent(params.episodeId)}?step=publish`);
}
