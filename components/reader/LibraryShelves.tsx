"use client";

import { useCallback, useId, useRef, useState, type KeyboardEvent } from "react";
import ReaderBookmarks from "@/components/reader/ReaderBookmarks";
import ReaderLibrary from "@/components/reader/ReaderLibrary";
import ReaderPeople from "@/components/reader/ReaderPeople";
import type { PersonEntry } from "@/lib/author-follows";
import type { BookmarkEntry } from "@/lib/bookmarks";
import { LIBRARY_SHELVES, type LibraryShelf } from "@/lib/library-shelves";
import type { LibraryEntry } from "@/lib/series-follows";

/*
 * The owner's Library (Sweep B2): one shelf at a time, chosen with chips that
 * show live counts: Following (series), Bookmarks (episodes), People (writers).
 * The choice is kept in the URL as ?shelf= (replaceState, no reload). All
 * three stay mounted so a pending Undo survives switching shelves.
 */
const LABELS: Record<LibraryShelf, string> = { following: "Following", bookmarks: "Bookmarks", people: "People" };

export default function LibraryShelves({
  initialShelf,
  series,
  bookmarks,
  bookmarkTotal,
  people,
}: {
  initialShelf: LibraryShelf;
  series: LibraryEntry[];
  bookmarks: { bookmarks: BookmarkEntry[]; nextCursor: string | null };
  bookmarkTotal: number;
  people: PersonEntry[];
}) {
  const id = useId();
  const [shelf, setShelf] = useState(initialShelf);
  const [counts, setCounts] = useState<Record<LibraryShelf, number>>({
    following: series.length,
    bookmarks: bookmarkTotal,
    people: people.length,
  });
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Stable callbacks so the shelves' count effects don't loop.
  const updateCount = useCallback((key: LibraryShelf, count: number) => {
    setCounts((current) => (current[key] === count ? current : { ...current, [key]: count }));
  }, []);
  const onFollowing = useCallback((count: number) => updateCount("following", count), [updateCount]);
  const onBookmarks = useCallback((count: number) => updateCount("bookmarks", count), [updateCount]);
  const onPeople = useCallback((count: number) => updateCount("people", count), [updateCount]);

  function choose(next: LibraryShelf, focus = false) {
    setShelf(next);
    if (focus) chipRefs.current[LIBRARY_SHELVES.indexOf(next)]?.focus();
    try {
      const url = new URL(window.location.href);
      if (next === "following") url.searchParams.delete("shelf");
      else url.searchParams.set("shelf", next);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // The shelf still switches; it just isn't remembered in the URL.
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = LIBRARY_SHELVES.indexOf(shelf);
    const move: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: LIBRARY_SHELVES.length - 1 };
    if (!(event.key in move)) return;
    event.preventDefault();
    const next = (move[event.key] + LIBRARY_SHELVES.length) % LIBRARY_SHELVES.length;
    choose(LIBRARY_SHELVES[next], true);
  }

  return (
    <div>
      <div role="tablist" aria-label="Library shelves" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {LIBRARY_SHELVES.map((key, index) => {
          const selected = key === shelf;
          return (
            <button
              key={key}
              ref={(element) => {
                chipRefs.current[index] = element;
              }}
              id={`${id}-chip-${key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-shelf-${key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => choose(key)}
              onKeyDown={handleKeyDown}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))] ${
                selected
                  ? "border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-card)]"
                  : "border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {LABELS[key]}
              <span className="font-mono-df text-xs tabular-nums text-[var(--text-muted)]">{counts[key]}</span>
            </button>
          );
        })}
      </div>

      <div id={`${id}-shelf-following`} role="tabpanel" aria-labelledby={`${id}-chip-following`} hidden={shelf !== "following"} className="mt-4">
        <ReaderLibrary entries={series} onCountChange={onFollowing} />
      </div>
      <div id={`${id}-shelf-bookmarks`} role="tabpanel" aria-labelledby={`${id}-chip-bookmarks`} hidden={shelf !== "bookmarks"} className="mt-4">
        <ReaderBookmarks initial={bookmarks} total={bookmarkTotal} onCountChange={onBookmarks} />
      </div>
      <div id={`${id}-shelf-people`} role="tabpanel" aria-labelledby={`${id}-chip-people`} hidden={shelf !== "people"} className="mt-4">
        <ReaderPeople initial={people} onCountChange={onPeople} />
      </div>
    </div>
  );
}
