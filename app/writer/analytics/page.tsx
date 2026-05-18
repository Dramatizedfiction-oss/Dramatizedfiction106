import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function WriterAnalyticsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <p className="theme-meta">Sign in to view analytics.</p>;
  }

  const stats = await prisma.userStats.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Analytics</p>
          <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
            Phase 1 analytics surface
          </h2>
          <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
            This is a routing and layout stub for the future analytics layer. It keeps the studio navigation real now without forcing deeper metrics work before the editor foundation is ready.
          </p>
        </div>
        <Link href="/writer/stats" className="story-button-secondary">
          Open full stats page
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AnalyticsCard label="Reads" value={String(stats?.totalReads ?? 0)} />
        <AnalyticsCard label="Episodes" value={String(stats?.totalEpisodes ?? 0)} />
        <AnalyticsCard label="Series" value={String(stats?.totalSeries ?? 0)} />
      </div>

      <div className="theme-panel rounded-[24px] border border-dashed border-[var(--border-color)] p-6">
        <p className="theme-meta text-sm leading-6">
          Future analytics modules can drop into this route without changing the studio shell. For now, this tab exists to prove navigation structure and mobile/desktop continuity.
        </p>
      </div>
    </div>
  );
}

function AnalyticsCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
      <p className="eyebrow">{label}</p>
      <p className="font-heading theme-heading mt-3 text-4xl font-semibold">{value}</p>
    </div>
  );
}
