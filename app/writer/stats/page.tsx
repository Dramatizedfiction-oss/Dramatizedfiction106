import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export default async function WriterStatsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <p className="theme-meta">You must be logged in.</p>;
  }

  const stats = await prisma.userStats.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Stats</p>
        <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
          Story performance
        </h2>
      </div>

      {!stats ? (
        <div className="theme-panel rounded-[24px] border border-dashed border-[var(--border-color)] p-6">
          <p className="theme-meta text-sm">No stats yet. Start publishing to generate momentum.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total Reads" value={String(stats.totalReads)} />
          <StatCard label="Episodes" value={String(stats.totalEpisodes)} />
          <StatCard label="Series" value={String(stats.totalSeries)} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
      <p className="eyebrow">{label}</p>
      <p className="font-heading theme-heading mt-3 text-4xl font-semibold">{value}</p>
    </div>
  );
}
