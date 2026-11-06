"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { EmptyShelf, SeeAllButton, ShelfError, SHELF_PREVIEW, SHELF_PREVIEW_WIDE } from "@/components/reader/ShelfParts";
import { COMMENT_MAX_LENGTH, timeAgo } from "@/lib/engagement-rules";
import type { HighlightEntry } from "@/lib/highlights";

/**
 * Library › Highlights (Sweep I): passages the member saved with "Save with
 * note" in the reader, newest first. Each shows the quote, the private note,
 * the series and episode, a link back to the exact passage, and Edit note /
 * Delete. Only ever rendered on the member's own reading profile; separate
 * from episode Bookmarks.
 */
export default function ReaderHighlights({
  initial,
  total,
  onCountChange,
}: {
  initial: { highlights: HighlightEntry[]; nextCursor: string | null };
  total: number;
  onCountChange?: (count: number) => void;
}) {
  const listId = useId();
  const [items, setItems] = useState(initial.highlights);
  const [count, setCount] = useState(total);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onCountChange?.(count);
  }, [count, onCountChange]);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/me/highlights?before=${encodeURIComponent(cursor)}`);
      const data = (await response.json().catch(() => null)) as { highlights?: HighlightEntry[]; nextCursor?: string | null } | null;
      if (!response.ok || !data?.highlights) throw new Error();
      const seen = new Set(items.map((item) => item.id));
      setItems((current) => [...current, ...data.highlights!.filter((item) => !seen.has(item.id))]);
      setCursor(data.nextCursor ?? null);
    } catch {
      setError("Couldn't load more highlights. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0 && !cursor) {
    return (
      <EmptyShelf
        title="No highlights yet"
        body="While reading, select a passage and choose “Save with note”. It will be kept here, with your note."
        action={false}
      />
    );
  }

  return (
    <div>
      <p className="theme-meta text-sm">Only you can see your highlights and notes.</p>
      <ul id={listId} className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((item, index) => (
          <HighlightItem
            key={item.id}
            item={item}
            hidden={!expanded && index >= SHELF_PREVIEW ? (index < SHELF_PREVIEW_WIDE ? "hidden sm:block" : "hidden") : undefined}
            onChanged={(next) => setItems((current) => current.map((other) => (other.id === next.id ? next : other)))}
            onDeleted={() => {
              setItems((current) => current.filter((other) => other.id !== item.id));
              setCount((value) => Math.max(0, value - 1));
            }}
            onError={setError}
          />
        ))}
      </ul>
      <SeeAllButton total={Math.max(count, items.length)} expanded={expanded} onToggle={() => setExpanded((value) => !value)} controls={listId} />
      {expanded && cursor ? (
        <div className="mt-4 text-center">
          <button type="button" onClick={() => void loadMore()} disabled={loading} className="story-button-secondary min-h-11 disabled:opacity-60">
            {loading ? "Loading…" : "Show more"}
          </button>
        </div>
      ) : null}
      <ShelfError message={error} />
    </div>
  );
}

function HighlightItem({
  item,
  hidden,
  onChanged,
  onDeleted,
  onError,
}: {
  item: HighlightEntry;
  hidden?: string;
  onChanged: (item: HighlightEntry) => void;
  onDeleted: () => void;
  onError: (message: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.note ?? "");
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    onError(null);
    const response = await fetch(`/api/me/highlights/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: draft.trim() ? draft : null }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { highlight?: HighlightEntry; error?: string } | null;
    setPending(false);
    if (!response?.ok || !data?.highlight) {
      onError(data?.error || "Couldn't save your note. Please try again.");
      return;
    }
    onChanged(data.highlight);
    setEditing(false);
  }

  async function remove() {
    if (!window.confirm("Delete this highlight and its note?")) return;
    setPending(true);
    onError(null);
    const response = await fetch(`/api/me/highlights/${encodeURIComponent(item.id)}`, { method: "DELETE" }).catch(() => null);
    setPending(false);
    if (!response?.ok) {
      onError("Couldn't delete the highlight. Please try again.");
      return;
    }
    onDeleted();
  }

  return (
    <li className={`${hidden ?? "block"} min-w-0 rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4`}>
      <p className="theme-meta truncate font-mono-df text-[10px] uppercase tracking-[0.18em]">
        {item.seriesTitle} · {item.episodeLabel} · {item.episodeTitle}
      </p>
      <Link href={`/episode/${item.episodeId}?highlight=${encodeURIComponent(item.id)}`} className="passage-quote mt-2 block transition hover:opacity-90">
        <span className="line-clamp-5">{item.quote}</span>
      </Link>
      {editing ? (
        <div className="mt-3">
          <label className="block">
            <span className="sr-only">Your note</span>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={COMMENT_MAX_LENGTH}
              rows={3}
              autoFocus
              className="ui-input block w-full resize-none px-3 py-2 text-base"
            />
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={pending} className="story-button-secondary min-h-11">
              Cancel
            </button>
            <button type="button" onClick={() => void save()} disabled={pending} className="story-button-primary min-h-11 disabled:opacity-50">
              {pending ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
      ) : item.note ? (
        <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-[var(--text-primary)]">{item.note}</p>
      ) : null}
      {!editing ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-1">
          <span className="theme-meta mr-auto text-xs" suppressHydrationWarning>Saved {timeAgo(item.createdAt)}</span>
          <Link href={`/episode/${item.episodeId}?highlight=${encodeURIComponent(item.id)}`} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-[var(--text-primary)] underline underline-offset-4">
            Go to passage
          </Link>
          <button
            type="button"
            onClick={() => {
              setDraft(item.note ?? "");
              setEditing(true);
            }}
            className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-[var(--text-primary)]"
          >
            {item.note ? "Edit note" : "Add note"}
          </button>
          <button type="button" onClick={() => void remove()} disabled={pending} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-[var(--status-danger)]">
            Delete
          </button>
        </div>
      ) : null}
    </li>
  );
}
