import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import SeriesCard from "@/components/SeriesCard";

export default async function WriterStudioSeriesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <div className="theme-meta">Not authorized.</div>;
  }

  const series = await prisma.series.findMany({
    where: { authorId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          name: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Series</p>
          <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
            Shape your story worlds
          </h2>
          <p className="theme-meta mt-3 max-w-2xl text-sm leading-6">
            Organize connected works, reader entry points, and future release arcs from one creator-first shelf.
          </p>
        </div>
        <Link href="/writer-studio" className="story-button-primary">
          Create Series
        </Link>
      </div>

      {series.length === 0 ? (
        <div className="theme-panel rounded-[28px] border border-dashed border-[var(--border-color)] p-8">
          <p className="theme-heading text-xl font-semibold">No series yet</p>
          <p className="theme-meta mt-3 max-w-xl text-sm leading-6">
            Start with a title, core premise, and AI usage label. This section is ready to become the home for seasons, arcs, and release structure.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {series.map((item) => (
            <SeriesCard key={item.id} series={item} />
          ))}
        </div>
      )}
    </div>
  );
}
