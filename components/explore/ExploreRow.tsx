"use client";

import { useRef } from "react";
import CoverSeriesCard, { type CoverSeries } from "@/components/home/CoverSeriesCard";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

export default function ExploreRow({
  title,
  series,
  highlight = false,
}: {
  title: string;
  series: CoverSeries[];
  highlight?: boolean;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);

  function scroll(direction: number) {
    rowRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  if (!series.length) return null;

  return (
    <section className="px-4 md:px-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {highlight ? <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" /> : null}
          <h2 className="font-heading text-lg font-semibold tracking-tight text-[var(--text-primary)] sm:text-xl">{title}</h2>
        </div>
        <div className="hidden items-center gap-1 md:flex">
          <button
            type="button"
            onClick={() => scroll(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--text-primary)]"
            aria-label={`Scroll ${title} left`}
          >
            <ChevronLeftIcon size={14} />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-color)] text-[var(--text-secondary)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--text-primary)]"
            aria-label={`Scroll ${title} right`}
          >
            <ChevronRightIcon size={14} />
          </button>
        </div>
      </div>
      <div
        ref={rowRef}
        className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2"
      >
        {series.map((item) => (
          <CoverSeriesCard key={item.id} series={item} variant="wide" />
        ))}
      </div>
    </section>
  );
}
