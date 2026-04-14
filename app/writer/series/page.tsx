import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";
import SeriesCard from "@/components/SeriesCard";

// Local type to satisfy strict TypeScript
type Series = {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  authorId: string;
  createdAt: Date;
};

export default async function WriterSeriesPage() {
  const session = await auth();
  requireRole(session, ["AUTHOR", "ADMIN", "CEO"]);

  // Strict-mode fix: TS requires a null check even after requireRole()
  if (!session?.user?.id) {
    return <div className="p-8">Not authorized.</div>;
  }

  // Explicitly type the Prisma result
  const series: Series[] = await prisma.series.findMany({
    where: { authorId: session.user.id },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Series</h1>
        <a
          href="/series/new"
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-semibold"
        >
          New Series
        </a>
      </div>

      {series.length === 0 && (
        <p className="text-slate-400">You haven't created any series yet.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {series.map((s: Series) => (
          <SeriesCard key={s.id} series={s} />
        ))}
      </div>
    </main>
  );
}

