import Link from "next/link";
import StudioSeriesCard from "@/components/writer-studio/series/StudioSeriesCard";
import StudioEmptyState from "@/components/writer-studio/StudioEmptyState";
import { listSeries } from "@/lib/writer-studio/queries";
import { requireStudioUser } from "@/lib/writer-studio/session";

export default async function StudioSeriesListPage() {
  const user = await requireStudioUser();
  const series = await listSeries(user.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading theme-heading text-2xl font-semibold">Series</h2>
          <p className="theme-meta mt-1 text-sm">
            A series becomes visible to readers when you publish its first episode.
          </p>
        </div>
        <Link href="/writer-studio/series/new" className="story-button-primary self-start">
          New series
        </Link>
      </div>

      {series.length === 0 ? (
        <StudioEmptyState
          title="No series yet"
          description="A series holds your episodes. Create one to start writing."
          action={
            <Link href="/writer-studio/series/new" className="story-button-primary">
              Create a series
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {series.map((item) => (
            <StudioSeriesCard key={item.id} series={item} />
          ))}
        </div>
      )}
    </div>
  );
}
