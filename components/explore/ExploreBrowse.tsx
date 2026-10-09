"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ExploreRow from "@/components/explore/ExploreRow";
import { SearchIcon } from "@/components/icons";
import type { CoverSeries } from "@/components/home/CoverSeriesCard";
import { GENRES } from "@/lib/genres";

export type ExploreStory = CoverSeries & {
  description?: string | null;
  createdAt: string;
};

export default function ExploreBrowse({
  stories,
  initialQuery = "",
  autoFocusSearch = false,
  showBecomeAuthorCta = false,
}: {
  stories: ExploreStory[];
  initialQuery?: string;
  autoFocusSearch?: boolean;
  showBecomeAuthorCta?: boolean;
}) {
  const [search, setSearch] = useState(initialQuery);
  const [activeGenre, setActiveGenre] = useState("all");
  const [sortBy, setSortBy] = useState<"trending" | "newest">("trending");
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
    if (sortBy === "newest") {
      return [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
    return [...list].sort((a, b) => (b.reads || 0) - (a.reads || 0));
  }, [activeGenre, search, sortBy, stories]);

  const isFiltering = Boolean(search.trim()) || activeGenre !== "all";
  const trending = [...stories].sort((a, b) => (b.reads || 0) - (a.reads || 0)).slice(0, 12);
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
        <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
          <select
            value={activeGenre}
            onChange={(event) => setActiveGenre(event.target.value)}
            aria-label="Filter by genre"
            className="ui-input min-h-9 min-w-0 flex-1 rounded-lg py-2 pl-3 pr-2 font-mono-df text-sm sm:w-40 sm:flex-none"
          >
            <option value="all">All genres</option>
            {GENRES.map((genre) => (
              <option key={genre} value={genre}>
                {genreLabel(genre)}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value === "newest" ? "newest" : "trending")}
            aria-label="Sort"
            className="ui-input min-h-9 min-w-0 flex-1 rounded-lg py-2 pl-3 pr-2 font-mono-df text-sm sm:w-36 sm:flex-none"
          >
            <option value="trending">Trending</option>
            <option value="newest">Newest</option>
          </select>
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
            <ExploreRow title="Trending Now" series={trending} highlight />
            {Object.entries(byGenre)
              .filter(([, list]) => list.length >= 1)
              .sort((a, b) => b[1].length - a[1].length)
              .map(([genre, list]) => (
                <ExploreRow
                  key={genre}
                  title={genre.charAt(0).toUpperCase() + genre.slice(1)}
                  series={list}
                />
              ))}
          </>
        )}
      </div>
    </div>
  );
}

/** "sci-fi" -> "Sci-Fi" (matches how the old genre chips were capitalized). */
function genreLabel(genre: string) {
  return genre.replace(/(^|-)(\w)/g, (_, sep: string, letter: string) => sep + letter.toUpperCase());
}
