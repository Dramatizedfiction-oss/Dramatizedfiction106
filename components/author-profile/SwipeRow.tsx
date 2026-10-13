"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A horizontal row of cards for the profile's Library and Author area: native
 * scroll-snap (swipe on touch, trackpad/shift-wheel on desktop) with a peek of
 * the next card, arrow buttons from `md`, and keyboard scrolling when the row
 * is focused (←/→). Children are the <li> cards.
 */
export default function SwipeRow({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const update = useCallback(() => {
    const row = ref.current;
    if (!row) return;
    setEdges({ start: row.scrollLeft <= 4, end: row.scrollLeft + row.clientWidth >= row.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    update();
    const row = ref.current;
    if (!row || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => observer.disconnect();
  }, [update, children]);

  function page(direction: 1 | -1) {
    const row = ref.current;
    if (!row) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reduceMotion === "true";
    row.scrollBy({ left: direction * row.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className="relative">
      <ul
        ref={ref}
        onScroll={update}
        tabIndex={0}
        aria-label={label}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowRight") {
            event.preventDefault();
            page(1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            page(-1);
          }
        }}
        className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] md:mx-0 md:scroll-px-0 md:px-0"
      >
        {children}
      </ul>
      <RowArrow direction={-1} hidden={edges.start} onClick={() => page(-1)} />
      <RowArrow direction={1} hidden={edges.end} onClick={() => page(1)} />
    </div>
  );
}

function RowArrow({ direction, hidden, onClick }: { direction: 1 | -1; hidden: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      aria-hidden="true"
      className={`absolute top-[38%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-card)] transition hover:bg-[var(--panel-hover)] md:flex ${
        direction === 1 ? "-right-3" : "-left-3"
      } ${hidden ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={direction === 1 ? "M8 4l6 6-6 6" : "M12 4l-6 6 6 6"} />
      </svg>
    </button>
  );
}
