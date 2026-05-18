import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMockWriterDrafts } from "@/lib/writer-studio";

export default async function WriterStudioHomePage() {
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
  const drafts = getMockWriterDrafts(session.user.id).slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Studio Home</p>
        <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
          Build inside a unified creator studio
        </h2>
        <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
          Draft episodes, shape series, and grow creator systems without leaving the
          same core platform experience readers use. Role changes unlock more tools,
          not a completely different interface.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Series" value={String(seriesCount)} />
        <StatCard label="Episodes" value={String(episodeCount)} />
        <StatCard label="Reads" value={String(stats?.totalReads ?? 0)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
          <p className="eyebrow">Episode Flow</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/writer-studio/new-episode" className="story-button-primary">
              Open New Episode
            </Link>
            <Link href="/writer-studio/series" className="story-button-secondary">
              Browse Series
            </Link>
          </div>
        </div>

        <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
          <p className="eyebrow">Studio Structure</p>
          <p className="theme-body mt-4 text-sm leading-6">
            Drafts, character systems, and editorial tools now live inside one
            scalable workspace shell so future creator features can plug in cleanly.
          </p>
        </div>
      </div>

      <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Continue Draft</p>
            <h3 className="theme-heading mt-3 text-2xl font-semibold">
              Pick up a working episode
            </h3>
          </div>
          <Link href="/writer-studio/drafts" className="story-button-secondary">
            View all draft options
          </Link>
        </div>

        <div className="mt-5 grid gap-3 xl:grid-cols-3">
          {drafts.map((draft) => (
            <Link
              key={draft.id}
              href={`/writer-studio/editor?draft=${draft.id}`}
              className="rounded-[20px] border border-[var(--border-color)] px-4 py-4 transition hover:border-[var(--text-primary)]"
            >
              <p className="theme-heading text-base font-semibold">{draft.title}</p>
              <p className="theme-meta mt-2 text-xs uppercase tracking-[0.24em]">
                {draft.seriesTitle}
              </p>
              <p className="theme-body mt-3 text-sm leading-6">{draft.excerpt}</p>
            </Link>
          ))}
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
