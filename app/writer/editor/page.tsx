import Link from "next/link";
import { auth } from "@/auth";
import WriterEditorSidebar from "@/components/writer/WriterEditorSidebar";
import {
  findMockDraftById,
  getMockCharacterDatabase,
} from "@/lib/writer-studio";

export default async function WriterEditorPage({
  searchParams,
}: {
  searchParams?: {
    draft?: string;
    mode?: string;
  };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return <p className="theme-meta">You must be signed in to open the editor.</p>;
  }

  const draft = findMockDraftById(session.user.id, searchParams?.draft);
  const isBlank = searchParams?.mode === "new" || !draft;
  const characters = getMockCharacterDatabase();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Editor Shell</p>
          <h2 className="font-heading theme-heading mt-3 text-4xl font-semibold">
            {isBlank ? "Blank episode canvas" : draft.title}
          </h2>
          <p className="theme-meta mt-3 max-w-3xl text-sm leading-6">
            {isBlank
              ? "This empty canvas is ready for future writing tools, formatting, and autosave systems."
              : `${draft.seriesTitle} · ${draft.updatedLabel}. Draft content is placeholder-backed for now so the editor flow can be tested without full persistence.`}
          </p>
        </div>

        <Link href="/writer/new-episode" className="story-button-secondary">
          Back to New Episode
        </Link>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <WriterEditorSidebar characters={characters} />

        <section className="min-w-0 flex-1">
          <div className="theme-panel min-h-[640px] rounded-[28px] border border-[var(--border-color)] px-5 py-5 md:px-8 md:py-7">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
              <div>
                <p className="eyebrow">Writing Canvas</p>
                <p className="theme-meta mt-2 text-sm">
                  {isBlank ? "Untitled episode" : draft.seriesTitle}
                </p>
              </div>
              <span className="theme-meta rounded-full border border-[var(--border-color)] px-3 py-2 text-xs uppercase tracking-[0.24em]">
                Placeholder State
              </span>
            </div>

            <div className="mx-auto mt-8 w-full max-w-[760px] space-y-6">
              <div className="rounded-[24px] border border-dashed border-[var(--border-color)] px-6 py-8">
                <h3 className="theme-heading text-2xl font-semibold">
                  {isBlank ? "Start your next episode here" : draft.title}
                </h3>
                <p className="theme-body mt-4 text-base leading-8">
                  {isBlank
                    ? "The writing surface is intentionally light in Phase 1. Future phases can attach rich text controls, autosave, scene memory, and structured episode settings without changing this route."
                    : draft.excerpt}
                </p>
                <p className="theme-meta mt-6 text-sm leading-6">
                  This canvas is a shell only. It is meant to show how an episode editor will feel on desktop and mobile before the full toolchain is attached.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="theme-panel rounded-[22px] border border-[var(--border-color)] p-4">
                  <p className="eyebrow">Document State</p>
                  <p className="theme-body mt-3 text-sm leading-6">
                    {isBlank
                      ? "Empty document route"
                      : `Loaded draft ${draft.id}`}
                  </p>
                </div>
                <div className="theme-panel rounded-[22px] border border-[var(--border-color)] p-4">
                  <p className="eyebrow">Future Plug-ins</p>
                  <p className="theme-body mt-3 text-sm leading-6">
                    Scene cards, live formatting, character inserts, and draft persistence can all attach here later.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
