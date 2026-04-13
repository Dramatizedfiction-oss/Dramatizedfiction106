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
      prisma.user.count({ where: { role: "AUTHOR" } }),
      prisma.series.findMany({
        orderBy: { reads: "desc" },
        take: 6
      })
    ]);

  return (
    <main className="p-8 space-y-10">
      <h1 className="text-3xl font-bold">Platform Analytics</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <h2 className="text-2xl font-semibold mb-4">Trending Series</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {trending.map((s) => (
            <SeriesCard key={s.id} series={s} />
          ))}
        </div>
      </section>
    </main>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-3xl font-bold mt-2">{value.toLocaleString()}</p>
    </div>
  );
}
