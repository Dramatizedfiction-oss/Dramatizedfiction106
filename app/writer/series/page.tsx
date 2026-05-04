import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import SeriesCard from "@/components/SeriesCard";

export default async function WriterSeriesPage() {
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
        </div>
        <Link href="/series/new" className="story-button-primary">
          New Series
        </Link>
      </div>

      {series.length === 0 ? (
        <div className="theme-panel rounded-[24px] border border-dashed border-[var(--border-color)] p-6">
          <p className="theme-meta text-sm">
            You have not created any series yet. Start with a title, core premise, and AI usage label.
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
