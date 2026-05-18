import Link from "next/link";
import { auth } from "@/auth";
import { getMockWriterDrafts } from "@/lib/writer-studio";

export default async function WriterStudioDraftsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <p className="theme-meta">Sign in to view drafts.</p>;
  }

  const drafts = getMockWriterDrafts(session.user.id);

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
            href={`/writer-studio/editor?draft=${draft.id}`}
            className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5 transition hover:border-[var(--text-primary)]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="theme-heading text-lg font-semibold">{draft.title}</p>
                <p className="theme-meta mt-2 text-xs uppercase tracking-[0.24em]">
                  {draft.seriesTitle}
                </p>
              </div>
              <span className="theme-meta text-xs">{draft.updatedLabel}</span>
            </div>
            <p className="theme-body mt-4 text-sm leading-6">{draft.excerpt}</p>
            <p className="theme-meta mt-4 text-xs">Progress {draft.completion}%</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
