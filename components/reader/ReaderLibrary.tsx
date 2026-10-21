"use client";

import { useEffect, useId, useState } from "react";
import { EmptyShelf, previewHiddenClass, SeeAllButton, ShelfError, ShelfRow } from "@/components/reader/ShelfParts";
import { send, useUndoableRemove } from "@/components/reader/useUndoableRemove";
import type { LibraryEntry } from "@/lib/series-follows";
import { safeHexColor, safeImageUrl } from "@/lib/writer-studio/format";

/**
 * Library › Followed Series: series the member follows, as tappable rows
 * (cover, title, author, episodes), the first few with "See all". The owner
 * can unfollow each with a short Undo; `visitor` is someone else's public
 * profile (read-only, its own wording). The heading is the caller's.
 */
export default function ReaderLibrary({
  entries,
  visitor = false,
  onCountChange,
}: {
  entries: LibraryEntry[];
  visitor?: boolean;
  onCountChange?: (count: number) => void;
}) {
  const listId = useId();
  const [expanded, setExpanded] = useState(false);
  const list = useUndoableRemove({
    initial: entries,
    keyOf: (entry) => entry.id,
    remove: (entry) => send(`/api/me/follows/${encodeURIComponent(entry.id)}`, "DELETE"),
    restore: (entry) => send(`/api/me/follows/${encodeURIComponent(entry.id)}`, "PUT"),
    failMessage: "Couldn't update your Followed Series. Please try again.",
  });

  useEffect(() => {
    onCountChange?.(list.liveCount);
  }, [list.liveCount, onCountChange]);

  if (list.items.length === 0) {
    return (
      <EmptyShelf
        title={visitor ? "No followed series yet" : "No series followed yet"}
        action={!visitor}
        body={
          visitor ? (
            "This reader hasn't followed any series yet."
          ) : (
            <>
              Tap <span className="font-semibold text-[var(--text-primary)]">Follow</span> on any series and it will be saved here.
            </>
          )
        }
      />
    );
  }

  return (
    <div>
      {visitor ? (
        <p className="theme-meta mb-3 text-sm">
          {list.liveCount} series followed
        </p>
      ) : null}
      <ul id={listId} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.items.map((entry, index) => {
          const cover = safeImageUrl(entry.coverImage);
          const accent = safeHexColor(entry.themeColor);
          return (
            <ShelfRow
              key={entry.id}
              href={`/series/${entry.id}`}
              hiddenClass={previewHiddenClass(index, expanded)}
              removeLabel={`Unfollow ${entry.title}`}
              onRemove={visitor ? undefined : () => list.removeItem(entry)}
              removed={list.removed.has(entry.id)}
              removedText={`Unfollowed ${entry.title}`}
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
                <span className="theme-heading block truncate font-heading text-lg font-semibold">{entry.title}</span>
                <span className="theme-meta mt-0.5 block truncate text-sm">
                  {entry.authorName ? `by ${entry.authorName}` : "Anonymous Author"}
                </span>
                <span className="theme-meta mt-1 block truncate font-mono-df text-[10px] uppercase tracking-[0.18em]">
                  {entry.genre} · {entry.episodeCount} {entry.episodeCount === 1 ? "episode" : "episodes"}
                </span>
              </span>
            </ShelfRow>
          );
        })}
      </ul>
      <SeeAllButton total={list.items.length} expanded={expanded} onToggle={() => setExpanded((value) => !value)} controls={listId} />
      <ShelfError message={list.error} />
    </div>
  );
}
