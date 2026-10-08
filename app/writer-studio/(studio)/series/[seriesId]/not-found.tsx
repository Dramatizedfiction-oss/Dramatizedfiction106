import Link from "next/link";
import StudioEmptyState from "@/components/writer-studio/StudioEmptyState";

export default function SeriesNotFound() {
  return (
    <StudioEmptyState
      title="Series not found"
      description="It may have been removed, or it belongs to another writer."
      action={
        <Link href="/writer-studio/series" className="story-button-secondary">
          Back to your series
        </Link>
      }
    />
  );
}
