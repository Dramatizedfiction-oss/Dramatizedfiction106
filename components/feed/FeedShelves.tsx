"use client";

import { useEffect, useRef, useState } from "react";
import ExploreRow from "@/components/explore/ExploreRow";
import type { ExploreSort } from "@/lib/explore-ranking";
import type { ComposedShelf } from "@/lib/feed/types";

/*
 * Explore's feed (Sweep C): the shelves under the top row. The first ones
 * come with the page; "More shelves" (also triggered when the button scrolls
 * into view) fetches the next ones from /api/feed. Cards already in the
 * current top row are left out (the top row can switch between Trending and
 * Newest without a reload). Only the first shelf's first cards load eagerly.
 */
export default function FeedShelves({
  initial,
  next: initialNext,
  composedSort,
  hiddenIds,
}: {
  initial: ComposedShelf[];
  next: number | null;
  /** The top row order the server composed the feed against (kept for every page). */
  composedSort: ExploreSort;
  /** Series in the top row on screen now. */
  hiddenIds: Set<string>;
}) {
  const [shelves, setShelves] = useState(initial);
  const [next, setNext] = useState(initialNext);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);

  // New Writers fairness: count this visitor's first screen once a day (the server decides who was shown).
  useEffect(() => {
    if (!initial.some((shelf) => shelf.rule === "NEW_WRITERS")) return;
    fetch("/api/feed/exposure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sort: composedSort }),
      keepalive: true,
    }).catch(() => undefined);
    // Once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMore() {
    if (next === null || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/feed?sort=${composedSort}&from=${next}`);
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { shelves: ComposedShelf[]; next: number | null };
      setShelves((current) => [...current, ...data.shelves.filter((shelf) => !current.some((item) => item.key === shelf.key))]);
      setNext(data.next);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  // Load the next shelves as the button comes near the screen (phones scroll, they don't click).
  useEffect(() => {
    const button = moreRef.current;
    if (!button || next === null || failed || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { rootMargin: "400px 0px" });
    observer.observe(button);
    return () => observer.disconnect();
    // loadMore reads the latest state through the closure of this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, failed, loading]);

  return (
    <>
      {shelves.map((shelf, index) => (
        <ExploreRow
          key={shelf.key}
          title={shelf.title}
          series={shelf.cards.filter((card) => !hiddenIds.has(card.id))}
          eagerCount={index === 0 ? 2 : 0}
        />
      ))}
      {next !== null ? (
        <div className="flex flex-col items-center gap-2 px-4">
          <button
            ref={moreRef}
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="story-button-secondary min-h-[48px] w-full max-w-xs justify-center font-mono-df text-sm"
          >
            {loading ? "Loading shelves..." : "More shelves"}
          </button>
          {failed ? (
            <p role="alert" className="text-sm text-[var(--status-danger)]">
              Couldn&apos;t load more shelves. Try again.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
