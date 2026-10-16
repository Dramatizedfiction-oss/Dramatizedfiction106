"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/*
 * Shared pieces of the Library shelves (Following, Bookmarks, People): the
 * friendly empty state and a row that can be removed with a short Undo.
 */

export function EmptyShelf({ eyebrow, title, body }: { eyebrow: string; title: string; body: ReactNode }) {
  return (
    <div className="theme-panel rounded-[24px] border border-dashed border-[var(--border-color)] px-5 py-10 text-center sm:px-8 sm:py-14">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="font-heading theme-heading mt-2 text-balance text-2xl font-semibold">{title}</h2>
      <p className="theme-meta mx-auto mt-3 max-w-md text-sm leading-6">{body}</p>
      <Link href="/explore" className="story-button-primary mt-6 min-h-11">
        Explore series
      </Link>
    </div>
  );
}

/**
 * One shelf item. With `onRemove` it gets a 44px ✕ button; once removed it
 * shows `removedText` and Undo in its place (same height, so nothing jumps).
 */
export function ShelfRow({
  href,
  children,
  removeLabel,
  onRemove,
  removed = false,
  removedText,
  onUndo,
}: {
  href: string;
  children: ReactNode;
  removeLabel?: string;
  onRemove?: () => void;
  removed?: boolean;
  removedText?: string;
  onUndo?: () => void;
}) {
  if (removed) {
    return (
      <li className="flex min-h-[108px] min-w-0 items-center gap-3 rounded-[20px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] py-2 pl-4 pr-2">
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
    <li className="flex min-w-0 items-stretch rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-secondary)]">
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
