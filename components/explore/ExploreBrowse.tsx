"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ExploreRow from "@/components/explore/ExploreRow";
import FeedShelves from "@/components/feed/FeedShelves";
import type { ComposedShelf } from "@/lib/feed/types";
import StyledDropdown, { type StyledOption } from "@/components/explore/StyledDropdown";
import { SearchIcon } from "@/components/icons";
import type { CoverSeries } from "@/components/home/CoverSeriesCard";
import { genreStyle, sortStyle } from "@/lib/filter-styles";
import { EXPLORE_SORT_COOKIE, parseExploreSort, type ExploreSort } from "@/lib/explore-ranking";
import { GENRES } from "@/lib/genres";

/** Explore's top row length; lib/feed/server.ts's TOP_ROW_SIZE must match (shelves don't repeat it). */
const TOP_ROW_SIZE = 12;

// Same options and order as before: "All genres" then lib/genres.ts; Trending, Newest.
const GENRE_OPTIONS: StyledOption[] = ["all", ...GENRES].map((value) => ({
  value,
  style: genreStyle(value),
}));
const SORT_OPTIONS: StyledOption[] = ["trending", "newest"].map((value) => ({
  value,
  style: sortStyle(value),
}));

export type ExploreStory = CoverSeries & {
  description?: string | null;
  createdAt: string;
};

export default function ExploreBrowse({
  stories,
  initialQuery = "",
  autoFocusSearch = false,
  showBecomeAuthorCta = false,
  initialGenre,
  initialSort = "trending",
  orders,
  feed,
}: {
  stories: ExploreStory[];
  initialQuery?: string;
  autoFocusSearch?: boolean;
  showBecomeAuthorCta?: boolean;
  /** Preselects a genre (?genre=); anything not in the list means all genres. */
  initialGenre?: string;
  /** Trending or Newest, from the URL or the choice made earlier this visit. */
  initialSort?: ExploreSort;
  /** Both orders from rankExplore (lib/explore-ranking.ts), so switching is instant. */
  orders: Record<ExploreSort, string[]>;
  /** The first shelves of the reader's feed (null if it couldn't be built). */
  feed?: { shelves: ComposedShelf[]; next: number | null; sort: ExploreSort; reservedIds: string[] } | null;
}) {
  const [search, setSearch] = useState(initialQuery);
  const [activeGenre, setActiveGenre] = useState(() => {
    const wanted = initialGenre?.trim().toLowerCase();
    return wanted && (GENRES as readonly string[]).includes(wanted) ? wanted : "all";
  });
  const [sortBy, setSortBy] = useState<ExploreSort>(initialSort);
  const position = useMemo(() => new Map(orders[sortBy].map((id, index) => [id, index])), [orders, sortBy]);
  const byOrder = (a: ExploreStory, b: ExploreStory) => (position.get(a.id) ?? Infinity) - (position.get(b.id) ?? Infinity);

  // Switching never reloads the page: both orders are already here. The choice
  // is kept for this visit (a session cookie, read by the server on the next
  // visit to Explore) and in the URL (?sort=newest), so refresh and sharing keep it.
  function changeSort(value: string) {
    const next = parseExploreSort(value);
    setSortBy(next);
    document.cookie = `${EXPLORE_SORT_COOKIE}=${next}; path=/; SameSite=Lax`;
    const url = new URL(window.location.href);
    if (next === "trending") url.searchParams.delete("sort");
    else url.searchParams.set("sort", next);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }
  const searchRef = useRef<HTMLInputElement>(null);

  // Arriving from the header's search button: put the cursor in the box.
  useEffect(() => {
    if (autoFocusSearch) searchRef.current?.focus();
  }, [autoFocusSearch]);

  const filtered = useMemo(() => {
    let list = stories;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (story) =>
          story.title.toLowerCase().includes(q) ||
          (story.authorName || "").toLowerCase().includes(q) ||
          (story.genre || "").toLowerCase().includes(q) ||
          (story.description || "").toLowerCase().includes(q),
      );
    }
    if (activeGenre !== "all") {
      list = list.filter((story) => (story.genre || "").toLowerCase() === activeGenre);
    }
    return [...list].sort(byOrder);
    // byOrder changes exactly when position does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGenre, search, position, stories]);

  const isFiltering = Boolean(search.trim()) || activeGenre !== "all";
  // The top row follows the switch: Trending now, or Newest.
  // Series in the reader's Continue Reading shelf stay there, not in the top row (lib/feed/server.ts topRowIds).
  const reserved = new Set(feed?.reservedIds ?? []);
  const topRow = [...stories].filter((story) => !reserved.has(story.id)).sort(byOrder).slice(0, TOP_ROW_SIZE);
  const topRowIds = new Set(topRow.map((story) => story.id));
  const byGenre = useMemo(() => {
    const map: Record<string, ExploreStory[]> = {};
    filtered.forEach((story) => {
      const genre = story.genre || "Fiction";
      if (!map[genre]) map[genre] = [];
      map[genre].push(story);
    });
    return map;
  }, [filtered]);

  return (
    <div className="min-h-screen">
      {/* Search takes the free width; the single-choice genre filter and the
          sort are compact dropdowns. Phones: search on its own row. The bar
          sits under the mobile header (h-14), and at the top on desktop. */}
      <div
        className="sticky top-14 z-30 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--border-color)] px-4 py-3 md:top-0 md:px-8 sm:flex-nowrap"
        style={{ background: "var(--header-bg)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
      >
        <div className="relative w-full min-w-0 sm:w-auto sm:flex-1">
          <SearchIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            ref={searchRef}
            placeholder="Search series, authors, genres..."
            aria-label="Search series, authors and genres"
            className="ui-input w-full rounded-lg py-2 pl-9 pr-3 font-mono-df text-sm"
          />
        </div>
        {/* Compact styled drop-downs (lib/filter-styles.config.ts); on wide
            screens they size to their content so the search box gets the room. */}
        <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
          <StyledDropdown
            label="Genre"
            options={GENRE_OPTIONS}
            value={activeGenre}
            onChange={setActiveGenre}
            className="flex-1 sm:flex-none"
          />
          <StyledDropdown
            label="Sort"
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={changeSort}
            className="flex-1 sm:flex-none"
          />
        </div>
      </div>

      <div className="space-y-10 py-8">
        {showBecomeAuthorCta ? (
          <div className="px-4 md:px-8">
            <div className="flex flex-col gap-4 theme-panel rounded-xl border p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-mono-df text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Creator Mode</p>
                <p className="mt-2 text-sm text-[var(--text-primary)]">Become a writer when you are ready to publish.</p>
              </div>
              <Link href="/become-author" className="story-button-primary shrink-0 justify-center font-mono-df text-sm">
                Become a Writer
              </Link>
            </div>
          </div>
        ) : null}

        {isFiltering ? (
          filtered.length > 0 ? (
            <ExploreRow title={`${filtered.length} result${filtered.length === 1 ? "" : "s"}`} series={filtered} />
          ) : (
            <p className="py-16 text-center font-mono-df text-sm text-[var(--text-secondary)]">No results found.</p>
          )
        ) : (
          <>
            <ExploreRow title={sortBy === "newest" ? "Newest" : "Trending now"} series={topRow} highlight eagerCount={2} />
            {feed ? (
              // Sweep C: the reader's feed of shelves (lib/feed).
              <FeedShelves initial={feed.shelves} next={feed.next} composedSort={feed.sort} hiddenIds={topRowIds} />
            ) : (
              // The feed couldn't be built: the plain genre rows.
              Object.entries(byGenre)
              .filter(([, list]) => list.length >= 1)
              .sort((a, b) => b[1].length - a[1].length)
              .map(([genre, list]) => (
                <ExploreRow
                  key={genre}
                  title={genre.charAt(0).toUpperCase() + genre.slice(1)}
                  series={list}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
