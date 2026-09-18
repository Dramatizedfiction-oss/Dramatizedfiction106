"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ExploreRow from "@/components/explore/ExploreRow";
import { SearchIcon } from "@/components/icons";
import type { CoverSeries } from "@/components/home/CoverSeriesCard";

const GENRES = [
  "thriller",
  "romance",
  "sci-fi",
  "fantasy",
  "drama",
  "horror",
  "mystery",
  "comedy",
  "historical",
  "literary",
];

export type ExploreStory = CoverSeries & {
  description?: string | null;
  createdAt: string;
};

export default function ExploreBrowse({
  stories,
  initialQuery = "",
  showBecomeAuthorCta = false,
}: {
  stories: ExploreStory[];
  initialQuery?: string;
  showBecomeAuthorCta?: boolean;
}) {
  const [search, setSearch] = useState(initialQuery);
  const [activeGenre, setActiveGenre] = useState("all");
  const [sortBy, setSortBy] = useState<"trending" | "newest">("trending");

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
    <div className="min-h-screen" style={{ backgroundColor: "var(--page-bg)" }}>
      <div
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-foreground/5 py-3 pl-16 pr-4 md:pl-8 md:pr-8"
        style={{ background: "var(--sidebar-bg)", backdropFilter: "blur(16px)" }}
      >
        <div className="relative max-w-md flex-1">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search series, authors, genres..."
            className="w-full rounded-lg border border-foreground/8 bg-foreground/5 py-2 pl-9 pr-4 font-mono-df text-sm text-foreground placeholder:text-foreground/25 focus:border-purple-500/40 focus:outline-none"
          />
        </div>
        <div className="hidden items-center gap-1 overflow-x-auto scrollbar-hide lg:flex">
          <GenreChip label="All" active={activeGenre === "all"} onClick={() => setActiveGenre("all")} />
          {GENRES.map((genre) => (
            <GenreChip
              key={genre}
              label={genre}
              active={activeGenre === genre}
              onClick={() => setActiveGenre(activeGenre === genre ? "all" : genre)}
            />
          ))}
        </div>
        <div className="flex gap-1">
          <GenreChip label="Trending" active={sortBy === "trending"} onClick={() => setSortBy("trending")} />
          <GenreChip label="Newest" active={sortBy === "newest"} onClick={() => setSortBy("newest")} />
        </div>
      </div>

      <div className="space-y-10 py-8">
        {showBecomeAuthorCta ? (
          <div className="px-4 md:px-8">
            <div className="flex flex-col gap-4 rounded-xl border border-foreground/8 bg-foreground/3 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-mono-df text-[10px] uppercase tracking-[0.2em] text-foreground/30">Creator Mode</p>
                <p className="mt-2 text-sm text-foreground/70">Become a writer when you are ready to publish.</p>
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
            <p className="py-16 text-center font-mono-df text-sm text-foreground/20">No results found.</p>
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

function GenreChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-3 py-1.5 font-mono-df text-xs capitalize transition-all ${
        active ? "bg-purple-600 text-white" : "bg-foreground/5 text-foreground/40 hover:text-foreground/70"
      }`}
    >
      {label}
    </button>
  );
}
