import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function WriterStudioDraftsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <p className="theme-meta">Sign in to view drafts.</p>;
  }

  const drafts = await prisma.episode.findMany({
    where: { authorId: session.user.id, status: { in: ["DRAFT", "REVIEW"] } },
    orderBy: { updatedAt: "desc" },
    include: { series: { select: { title: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Drafts</p>
          <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
            Continue building active episodes
          </h2>
        </div>
        <Link href="/writer-studio/new-episode" className="story-button-primary">
          New Episode
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {drafts.map((draft) => (
          <Link
            key={draft.id}
            href={`/writer-studio?series=${draft.seriesId}&episode=${draft.id}`}
            className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5 transition hover:border-[var(--text-primary)]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="theme-heading text-lg font-semibold">{draft.title}</p>
                <p className="theme-meta mt-2 text-xs uppercase tracking-[0.24em]">
                  {draft.series.title} · {draft.status}
                </p>
              </div>
              <span className="theme-meta text-xs">{draft.updatedAt.toLocaleDateString()}</span>
            </div>
            <p className="theme-body mt-4 line-clamp-3 text-sm leading-6">
              {draft.description || "No episode description yet."}
            </p>
            <p className="theme-meta mt-4 text-xs">Episode {draft.episodeNumber}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
