import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireRole } from "@/lib/utils";

export default async function WriterStatsPage() {
  const session = await auth();
  requireRole(session, ["AUTHOR", "ADMIN", "CEO"]);

  const stats = await prisma.userStats.findUnique({
    where: { userId: session.user.id }
  });

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Your Stats</h1>

      {!stats && (
        <p className="text-slate-400">No stats yet. Start publishing!</p>
      )}

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
            <h2 className="text-xl font-semibold">Total Reads</h2>
            <p className="text-3xl font-bold mt-2">{stats.totalReads}</p>
          </div>

          <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
            <h2 className="text-xl font-semibold">Episodes</h2>
            <p className="text-3xl font-bold mt-2">{stats.totalEpisodes}</p>
          </div>

          <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
            <h2 className="text-xl font-semibold">Series</h2>
            <p className="text-3xl font-bold mt-2">{stats.totalSeries}</p>
          </div>
        </div>
      )}
    </main>
  );
}
