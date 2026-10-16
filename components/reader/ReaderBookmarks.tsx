"use client";

import { useEffect, useState } from "react";
import { EmptyShelf, ShelfError, ShelfRow } from "@/components/reader/ShelfParts";
import { send, useUndoableRemove } from "@/components/reader/useUndoableRemove";
import type { BookmarkEntry } from "@/lib/bookmarks";
import { timeAgo } from "@/lib/engagement-rules";
import { safeHexColor, safeImageUrl } from "@/lib/writer-studio/format";

/**
 * Library › Bookmarks: the member's own saved episodes (from the reader's
 * bookmark button), newest first, with Remove + Undo and "Show more". Not
 * reading progress. Only ever rendered on the member's own reading profile.
 */
export default function ReaderBookmarks({
  initial,
  total,
  onCountChange,
}: {
  initial: { bookmarks: BookmarkEntry[]; nextCursor: string | null };
  total: number;
  onCountChange?: (count: number) => void;
}) {
  const list = useUndoableRemove({
    initial: initial.bookmarks,
    keyOf: (entry) => entry.episodeId,
    remove: (entry) => send(`/api/me/bookmarks/${encodeURIComponent(entry.episodeId)}`, "DELETE"),
    restore: (entry) => send(`/api/me/bookmarks/${encodeURIComponent(entry.episodeId)}`, "PUT"),
    failMessage: "Couldn't update your bookmarks. Please try again.",
  });
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loadedEver, setLoadedEver] = useState(initial.bookmarks.length);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Bookmarks not loaded yet still count.
  const count = list.liveCount + Math.max(0, total - loadedEver);
  useEffect(() => {
    onCountChange?.(count);
  }, [count, onCountChange]);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/me/bookmarks?before=${encodeURIComponent(cursor)}`);
      const data = (await response.json().catch(() => null)) as { bookmarks?: BookmarkEntry[]; nextCursor?: string | null } | null;
      if (!response.ok || !data?.bookmarks) throw new Error();
      const more = data.bookmarks;
      list.setItems((current) => {
        const seen = new Set(current.map((entry) => entry.episodeId));
        return [...current, ...more.filter((entry) => !seen.has(entry.episodeId))];
      });
      setLoadedEver((value) => value + more.length);
      setCursor(data.nextCursor ?? null);
    } catch {
      setLoadError("Couldn't load more bookmarks. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (list.items.length === 0 && !cursor) {
    return (
      <EmptyShelf eyebrow="Bookmarks" title="No bookmarks yet" body="Tap the bookmark icon while reading an episode and it will be saved here." />
    );
  }

  return (
    <div>
      <h2 className="sr-only">Bookmarks</h2>
      <p className="theme-meta text-sm">Only you can see your bookmarks.</p>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.items.map((entry) => {
          const cover = safeImageUrl(entry.coverImage);
          const accent = safeHexColor(entry.themeColor);
          return (
            <ShelfRow
              key={entry.episodeId}
              href={`/episode/${entry.episodeId}`}
              removeLabel={`Remove ${entry.episodeTitle} from your bookmarks`}
              onRemove={() => list.removeItem(entry)}
              removed={list.removed.has(entry.episodeId)}
              removedText={`Removed ${entry.episodeTitle}`}
              onUndo={() => list.undo(entry)}
            >
              <span
                className="relative h-[84px] w-[63px] shrink-0 overflow-hidden rounded-xl"
                style={{ background: `linear-gradient(160deg, ${accent}, ${accent}33)` }}
              >
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="theme-meta block truncate font-mono-df text-[10px] uppercase tracking-[0.18em]">
                  {entry.seriesTitle} · Ep {entry.episodeNumber}
                </span>
                <span className="theme-heading mt-0.5 block truncate font-heading text-lg font-semibold">{entry.episodeTitle}</span>
                <span className="theme-meta mt-0.5 block text-xs">Saved {timeAgo(entry.bookmarkedAt)}</span>
              </span>
            </ShelfRow>
          );
        })}
      </ul>
      {cursor ? (
        <div className="mt-4 text-center">
          <button type="button" onClick={() => void loadMore()} disabled={loading} className="story-button-secondary min-h-11 disabled:opacity-60">
            {loading ? "Loading…" : "Show more"}
          </button>
        </div>
      ) : null}
      <ShelfError message={list.error ?? loadError} />
    </div>
  );
}
