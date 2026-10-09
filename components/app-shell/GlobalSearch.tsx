"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

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
  open = false,
  onClose,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [inlineOpen, setInlineOpen] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);
  const showOverlay = mode === "overlay";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 180);

    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!showOverlay && query.trim()) {
      setInlineOpen(true);
    }
  }, [query, showOverlay]);

  useEffect(() => {
    if (!showOverlay || !open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open, showOverlay]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const results = useMemo(() => {
    if (!debouncedQuery) {
      return {
        stories: stories.slice(0, 4),
        authors: authors.slice(0, 4),
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

  const shouldShowInlineResults = !showOverlay && inlineOpen;

  function closeInlineResults() {
    setInlineOpen(false);
  }

  function handleBlur() {
    if (showOverlay) {
      return;
    }

    blurTimeoutRef.current = window.setTimeout(() => {
      closeInlineResults();
    }, 120);
  }

  function handleFocus() {
    if (!showOverlay) {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
      setInlineOpen(true);
    }
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (showOverlay) {
        onClose?.();
      } else {
        closeInlineResults();
        (event.currentTarget as HTMLInputElement).blur();
      }
    }
  }

  function handleResultClick() {
    if (showOverlay) {
      onClose?.();
      return;
    }

    closeInlineResults();
  }

  if (showOverlay && !open) {
    return null;
  }

  const resultsPanel = (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-raised)] p-3 shadow-[var(--shadow-raised)]">
      <div className="grid gap-4">
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
                  className="block rounded-lg border border-[var(--border-color)] px-3 py-2 transition hover:bg-[var(--panel-hover)]"
                  onClick={handleResultClick}
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
                  className="block rounded-lg border border-[var(--border-color)] px-3 py-2 transition hover:bg-[var(--panel-hover)]"
                  onClick={handleResultClick}
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
  );

  if (showOverlay) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-[var(--overlay-bg)] backdrop-blur-xl">
        <button
          type="button"
          className="absolute inset-0"
          onClick={onClose}
          aria-label="Close search"
        />

        <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col bg-[var(--page-bg)] px-4 py-6 md:px-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Global Search</p>
              <h2 className="font-heading theme-heading mt-2 text-2xl font-semibold sm:text-4xl">
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

          <div className="ui-input flex items-center gap-3 rounded-full px-4 py-3">
            <span className="theme-meta text-sm">Search</span>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search stories and authors"
              className="w-full bg-transparent text-[var(--text-primary)] outline-none"
            />
          </div>

          <div className="mt-6 flex-1 overflow-y-auto">{resultsPanel}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="ui-input flex items-center rounded-lg px-3 py-2 focus-within:border-[var(--accent)]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search"
          className="w-full bg-transparent font-mono-df text-xs text-[var(--text-primary)] outline-none"
        />
      </div>

      {shouldShowInlineResults && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-5rem))]">
          {resultsPanel}
        </div>
      )}
    </div>
  );
}
