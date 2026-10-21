"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import ReaderBookmarks from "@/components/reader/ReaderBookmarks";
import ReaderLibrary from "@/components/reader/ReaderLibrary";
import ReaderPeople from "@/components/reader/ReaderPeople";
import { ShelfHeading } from "@/components/reader/ShelfParts";
import type { PersonEntry } from "@/lib/author-follows";
import type { BookmarkEntry } from "@/lib/bookmarks";
import { LIBRARY_SHELF_IDS, LIBRARY_SHELF_TITLES, type LibraryShelf } from "@/lib/library-shelves";
import type { LibraryEntry } from "@/lib/series-follows";

/*
 * The owner's Library (Sweep B2; one scrolling page since Sweep D): three
 * stacked sections, Followed Series, Bookmarks and Follows (writers), each
 * with a live count and its first few items ("See all" for the rest). An old
 * or shared ?shelf= link scrolls to its section.
 */
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
  const [counts, setCounts] = useState<Record<LibraryShelf, number>>({
    following: series.length,
    bookmarks: bookmarkTotal,
    people: people.length,
  });

  // Stable callbacks so the sections' count effects don't loop.
  const updateCount = useCallback((key: LibraryShelf, count: number) => {
    setCounts((current) => (current[key] === count ? current : { ...current, [key]: count }));
  }, []);
  const onFollowing = useCallback((count: number) => updateCount("following", count), [updateCount]);
  const onBookmarks = useCallback((count: number) => updateCount("bookmarks", count), [updateCount]);
  const onPeople = useCallback((count: number) => updateCount("people", count), [updateCount]);

  // Instantly: the site's smooth scrolling would animate down the whole page.
  useEffect(() => {
    if (initialShelf === "following") return;
    document.getElementById(LIBRARY_SHELF_IDS[initialShelf])?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [initialShelf]);

  const section = (key: LibraryShelf, body: ReactNode) => (
    <section id={LIBRARY_SHELF_IDS[key]} aria-labelledby={`${LIBRARY_SHELF_IDS[key]}-heading`} className="scroll-mt-20">
      <ShelfHeading id={`${LIBRARY_SHELF_IDS[key]}-heading`} title={LIBRARY_SHELF_TITLES[key]} count={counts[key]} />
      {body}
    </section>
  );

  return (
    <div className="space-y-10">
      {section("following", <ReaderLibrary entries={series} onCountChange={onFollowing} />)}
      {section("bookmarks", <ReaderBookmarks initial={bookmarks} total={bookmarkTotal} onCountChange={onBookmarks} />)}
      {section("people", <ReaderPeople initial={people} onCountChange={onPeople} />)}
    </div>
  );
}
