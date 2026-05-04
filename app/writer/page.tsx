import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function WriterHome() {
  const session = await auth();

  if (!session?.user?.id) {
    return <p className="theme-meta">Sign in to view your studio.</p>;
  }

  const [seriesCount, episodeCount, stats] = await Promise.all([
    prisma.series.count({
      where: { authorId: session.user.id },
    }),
    prisma.episode.count({
      where: { authorId: session.user.id },
    }),
    prisma.userStats.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Dashboard</p>
        <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
          Your studio at a glance
        </h2>
        <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
          Move between one panel at a time and keep the workspace focused on writing, shaping series, and monitoring how stories travel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Series" value={String(seriesCount)} />
        <StatCard label="Episodes" value={String(episodeCount)} />
        <StatCard label="Reads" value={String(stats?.totalReads ?? 0)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
          <p className="eyebrow">Quick Actions</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/series/new" className="story-button-primary">
              New Series
            </Link>
            <Link href="/episode/new" className="story-button-secondary">
              New Episode
            </Link>
          </div>
        </div>

        <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
          <p className="eyebrow">Trust Layer</p>
          <p className="theme-body mt-4 text-sm leading-6">
            Every series and episode now carries a required AI usage label, and readers can report incorrect tagging without interrupting the reading flow.
          </p>
        </div>
      </div>
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
