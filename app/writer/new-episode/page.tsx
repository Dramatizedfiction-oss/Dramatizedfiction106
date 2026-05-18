import Link from "next/link";
import { auth } from "@/auth";
import { getMockWriterDrafts } from "@/lib/writer-studio";

export default async function WriterNewEpisodePage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <p className="theme-meta">Sign in to start a new episode.</p>;
  }

  const drafts = getMockWriterDrafts(session.user.id).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">New Episode</p>
        <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
          Choose your writing path
        </h2>
        <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
          Start with a blank canvas or step back into one of your recent drafts. This is a UI shell for the studio flow, so the draft layer is mock-ready and easy to swap for real persistence later.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
          <p className="eyebrow">Start New</p>
          <h3 className="theme-heading mt-3 text-2xl font-semibold">
            Open a blank episode canvas
          </h3>
          <p className="theme-body mt-4 text-sm leading-6">
            Route directly into the editor with empty placeholder state so structure, scene rhythm, and tool layout can be tested before the real drafting engine arrives.
          </p>

          <div className="mt-5">
            <Link href="/writer/editor?mode=new" className="story-button-primary">
              Start New
            </Link>
          </div>
        </div>

        <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Continue Draft</p>
              <h3 className="theme-heading mt-3 text-2xl font-semibold">
                Recent drafts
              </h3>
            </div>
            <span className="theme-meta text-xs uppercase tracking-[0.24em]">
              Up to 5
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {drafts.map((draft) => (
              <Link
                key={draft.id}
                href={`/writer/editor?draft=${draft.id}`}
                className="block rounded-[20px] border border-[var(--border-color)] px-4 py-4 transition hover:border-[var(--text-primary)]"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="theme-heading text-base font-semibold">{draft.title}</p>
                    <p className="theme-meta mt-2 text-xs uppercase tracking-[0.24em]">
                      {draft.seriesTitle}
                    </p>
                  </div>
                  <span className="theme-meta text-xs">{draft.updatedLabel}</span>
                </div>
                <p className="theme-body mt-3 text-sm leading-6">{draft.excerpt}</p>
                <p className="theme-meta mt-3 text-xs">
                  Progress {draft.completion}%
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
