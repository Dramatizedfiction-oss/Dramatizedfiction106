"use client";

/** Which editor tab a prompt or hint opens. */
export type EditorTab = "basics" | "library" | "about" | "links";

export const OPEN_EDITOR_EVENT = "df:edit-author-profile";

/** Opens the owner's profile editor at a tab (AuthorProfileEditor listens). */
export function openAuthorProfileEditor(tab: EditorTab) {
  window.dispatchEvent(new CustomEvent<EditorTab>(OPEN_EDITOR_EVENT, { detail: tab }));
}

/**
 * The faint, owner-only prompt shown in place of an empty section ("Add your
 * bio"). Visitors never see it: empty sections don't render for them at all.
 */
export default function OwnerPrompt({ tab, children }: { tab: EditorTab; children: string }) {
  return (
    <button
      type="button"
      onClick={() => openAuthorProfileEditor(tab)}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-dashed border-[var(--border-strong)] px-4 py-3 text-left text-sm text-[var(--text-muted)] transition hover:border-[hsl(var(--series-accent))] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
    >
      <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-base leading-none">
        +
      </span>
      <span>{children}</span>
      <span className="sr-only"> (only you can see this)</span>
    </button>
  );
}
