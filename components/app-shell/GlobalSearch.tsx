"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type SearchStory = {
  id: string;
  title: string;
  description?: string | null;
};

export type SearchAuthor = {
  id: string;
  name?: string | null;
};

type GlobalSearchProps = {
  stories: SearchStory[];
  authors: SearchAuthor[];
  mode?: "inline" | "overlay";
  open?: boolean;
  onClose?: () => void;
};

export default function GlobalSearch({
  stories,
  authors,
  mode = "inline",
  open = true,
  onClose,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 180);

    return () => window.clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    if (!debouncedQuery) {
      return {
        stories: stories.slice(0, 5),
        authors: authors.slice(0, 5),
      };
    }

    return {
      stories: stories
        .filter((story) =>
          [story.title, story.description || ""].join(" ").toLowerCase().includes(debouncedQuery),
        )
        .slice(0, 6),
      authors: authors
        .filter((author) => (author.name || "Anonymous Author").toLowerCase().includes(debouncedQuery))
        .slice(0, 6),
    };
  }, [authors, debouncedQuery, stories]);

  const showOverlay = mode === "overlay";

  if (showOverlay && !open) {
    return null;
  }

  return (
    <div
      className={
        showOverlay
          ? "fixed inset-0 z-50 bg-[var(--overlay-bg)] backdrop-blur-xl"
          : "relative w-full max-w-md"
      }
    >
      <div
        className={
          showOverlay
            ? "mx-auto mt-0 flex min-h-screen w-full max-w-3xl flex-col bg-[var(--bg-primary)] px-4 py-6 md:px-8"
            : "relative"
        }
      >
        {showOverlay && (
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Global Search</p>
              <h2 className="font-heading theme-heading mt-2 text-4xl font-semibold">
                Find stories and authors
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="story-button-secondary"
            >
              Close
            </button>
          </div>
        )}

        <div className="theme-panel flex items-center gap-3 rounded-full border px-4 py-3">
          <span className="theme-meta text-sm">⌕</span>
          <input
            autoFocus={showOverlay}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search stories and authors"
            className="w-full bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>

        <div className={showOverlay ? "mt-6 flex-1 overflow-y-auto" : "absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30"}>
          <div className="theme-panel rounded-[24px] border p-4 shadow-2xl">
            <div className="grid gap-6 md:grid-cols-2">
              <section>
                <p className="eyebrow">Stories</p>
                <div className="mt-3 space-y-2">
                  {results.stories.length === 0 ? (
                    <p className="theme-meta text-sm">No matching stories.</p>
                  ) : (
                    results.stories.map((story) => (
                      <Link
                        key={story.id}
                        href={`/series/${story.id}`}
                        className="theme-panel theme-panel-hover block rounded-2xl border px-4 py-3 transition hover:opacity-80"
                        onClick={onClose}
                      >
                        <p className="theme-heading font-medium">{story.title}</p>
                        <p className="theme-meta mt-1 line-clamp-2 text-sm">
                          {story.description || "Open this story to explore the world."}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              <section>
                <p className="eyebrow">Authors</p>
                <div className="mt-3 space-y-2">
                  {results.authors.length === 0 ? (
                    <p className="theme-meta text-sm">No matching authors.</p>
                  ) : (
                    results.authors.map((author) => (
                      <Link
                        key={author.id}
                        href={`/author/${author.id}`}
                        className="theme-panel theme-panel-hover block rounded-2xl border px-4 py-3 transition hover:opacity-80"
                        onClick={onClose}
                      >
                        <p className="theme-heading font-medium">
                          {author.name || "Anonymous Author"}
                        </p>
                        <p className="theme-meta mt-1 text-sm">
                          Explore this creator&apos;s published work.
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
