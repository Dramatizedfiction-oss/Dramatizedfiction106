import { episodeStatusLabel, isLive } from "@/lib/writer-studio/status";

export default function EpisodeStatusBadge({ status }: { status: string }) {
  const live = isLive(status);
  return (
    <span className={`studio-status ${live ? "studio-status-live" : "studio-status-draft"}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {episodeStatusLabel(status)}
    </span>
  );
}
