"use client";

/**
 * "Unfollowed X · Undo", fixed above the bottom of the screen (thumb reach on
 * phones). Rendered empty when `message` is null so the live region stays put.
 */
export default function UndoToast({ message, onUndo }: { message: string | null; onUndo: () => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center">
      {message ? (
        <div className="pointer-events-auto flex min-h-12 max-w-md min-w-0 items-center gap-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-raised)] py-1 pl-4 pr-1 text-sm text-[var(--text-primary)] shadow-[var(--shadow-raised)]">
          <span className="min-w-0 truncate">{message}</span>
          <button
            type="button"
            onClick={onUndo}
            className="min-h-11 rounded-xl px-3 font-semibold underline decoration-1 underline-offset-4 hover:bg-[var(--panel-hover)]"
          >
            Undo
          </button>
        </div>
      ) : null}
    </div>
  );
}
