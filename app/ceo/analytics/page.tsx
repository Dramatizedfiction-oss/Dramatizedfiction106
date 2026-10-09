import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";
import SeriesCard from "@/components/SeriesCard";

export default async function CEOAnalyticsPage() {
  const session = await auth();
  requireRole(session, ["CEO"]);

  const [totalReads, totalSeries, totalEpisodes, totalAuthors, trending] =
    await Promise.all([
      prisma.episode.aggregate({ _sum: { readerCount: true } }),
      prisma.series.count(),
      prisma.episode.count(),
      prisma.user.count({ where: { role: "WRITER" } }),
      prisma.series.findMany({
        orderBy: { reads: "desc" },
        take: 6
      })
    ]);

  return (
    <main className="space-y-10 px-4 py-6 md:p-8">
      <h1 className="theme-heading text-3xl font-bold">Platform Analytics</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
        <StatCard
          title="Total Reads"
          value={totalReads._sum.readerCount || 0}
        />
        <StatCard title="Total Series" value={totalSeries} />
        <StatCard title="Total Episodes" value={totalEpisodes} />
        <StatCard title="Total Authors" value={totalAuthors} />
      </div>

      {/* Trending Series */}
      <section>
        <h2 className="theme-heading mb-4 text-2xl font-semibold">Trending Series</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {trending.map((s) => (
            <SeriesCard key={s.id} series={s} />
          ))}
        </div>
      </section>
    </main>
  );
}

function StatCard({
  title,
  value
}: {
  title: string;
  value: number | string;
}) {
  return (
    <div className="theme-panel rounded-lg border p-4 md:p-6">
      <h3 className="theme-meta text-xs font-semibold uppercase tracking-[0.16em] md:text-sm">{title}</h3>
      <p className="theme-heading mt-2 text-2xl font-bold md:text-3xl">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
