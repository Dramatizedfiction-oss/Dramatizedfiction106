"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/*
 * Shared pieces of the Library sections (Followed Series, Bookmarks, Follows):
 * the friendly empty state, a row that can be removed with a short Undo, and
 * the "See all" that keeps one long section from pushing the others away.
 */

/** Items a section shows before "See all": 4 on phones, 6 from `sm` up. */
export const SHELF_PREVIEW = 4;
export const SHELF_PREVIEW_WIDE = 6;

/** Class that hides a row beyond the preview (none once the section is expanded). */
export function previewHiddenClass(index: number, expanded: boolean) {
  if (expanded || index < SHELF_PREVIEW) return undefined;
  return index < SHELF_PREVIEW_WIDE ? "hidden sm:flex" : "hidden";
}

/** "See all (N)" / "Show fewer"; hidden from `sm` up when the wide preview already shows everything. */
export function SeeAllButton({
  total,
  expanded,
  onToggle,
  controls,
}: {
  total: number;
  expanded: boolean;
  onToggle: () => void;
  controls: string;
}) {
  if (total <= SHELF_PREVIEW) return null;
  return (
    <div className={`mt-3 text-center ${!expanded && total <= SHELF_PREVIEW_WIDE ? "sm:hidden" : ""}`}>
      <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={controls} className="story-button-secondary min-h-11">
        {expanded ? "Show fewer" : `See all (${total})`}
      </button>
    </div>
  );
}

/** The heading above each Library section, with its live count. */
export function ShelfHeading({ id, title, count }: { id: string; title: string; count?: number }) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <h2 id={id} className="font-heading theme-heading text-xl font-semibold">
        {title}
      </h2>
      {count !== undefined ? <span className="font-mono-df text-xs tabular-nums text-[var(--text-muted)]">{count}</span> : null}
    </div>
  );
}

/** A compact empty state: three of them fit on one phone screen. */
export function EmptyShelf({ title, body, action = true }: { title: string; body: ReactNode; action?: boolean }) {
  return (
    <div className="theme-panel rounded-[20px] border border-dashed border-[var(--border-color)] px-5 py-6 text-center">
      <p className="theme-heading text-base font-semibold">{title}</p>
      <p className="theme-meta mx-auto mt-1.5 max-w-md text-sm leading-6">{body}</p>
      {action ? (
        <Link href="/explore" className="story-button-secondary mt-4 min-h-11">
          Explore series
        </Link>
      ) : null}
    </div>
  );
}

/**
 * One shelf item. With `onRemove` it gets a 44px ✕ button; once removed it
 * shows `removedText` and Undo in its place (same height, so nothing jumps).
 * `hiddenClass` hides it beyond the section's preview (previewHiddenClass).
 */
export function ShelfRow({
  href,
  children,
  removeLabel,
  onRemove,
  removed = false,
  removedText,
  onUndo,
  hiddenClass,
}: {
  href: string;
  children: ReactNode;
  removeLabel?: string;
  onRemove?: () => void;
  removed?: boolean;
  removedText?: string;
  onUndo?: () => void;
  hiddenClass?: string;
}) {
  const display = hiddenClass ?? "flex";
  if (removed) {
    return (
      <li className={`${display} min-h-[108px] min-w-0 items-center gap-3 rounded-[20px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] py-2 pl-4 pr-2`}>
        <span role="status" className="theme-meta min-w-0 flex-1 text-sm">
          {removedText}
        </span>
        <button
          type="button"
          onClick={onUndo}
          className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-[var(--text-primary)] underline decoration-1 underline-offset-4 hover:bg-[var(--panel-hover)]"
        >
          Undo
        </button>
      </li>
    );
  }

  return (
    <li className={`${display} min-w-0 items-stretch rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-secondary)]`}>
      <Link href={href} className="theme-panel-hover flex min-h-[96px] min-w-0 flex-1 items-center gap-4 rounded-[20px] p-3 transition">
        {children}
      </Link>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="flex w-11 shrink-0 items-center justify-center rounded-r-[20px] text-[var(--text-secondary)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--text-primary)]"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      ) : null}
    </li>
  );
}

export function ShelfError({ message }: { message: string | null }) {
  return message ? (
    <p role="alert" className="mt-3 text-sm text-[var(--status-danger)]">
      {message}
    </p>
  ) : null;
}
