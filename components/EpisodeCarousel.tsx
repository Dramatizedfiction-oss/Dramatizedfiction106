"use client";

import { useRef } from "react";
import EpisodeCard from "@/components/EpisodeCard";
import SeasonSelector from "@/components/series/SeasonSelector";
import type { MonetizedEpisode, MonetizedUser } from "@/lib/monetization";

type EpisodeCarouselEpisode = {
  id: string;
  title?: string | null;
  episodeNumber?: number | null;
  seasonNumber?: number | null;
  teaser?: string | null;
  readTime?: number | null;
  readerCount?: number | null;
  isRead?: boolean | null;
  monetization?: Partial<MonetizedEpisode>;
};

type EpisodeCarouselProps = {
  episodes: EpisodeCarouselEpisode[];
  viewer?: MonetizedUser | null;
};

export default function EpisodeCarousel({ episodes, viewer = null }: EpisodeCarouselProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function scroll(direction: "left" | "right") {
    if (!scrollRef.current) {
      return;
    }

    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -width : width,
      behavior: "smooth",
    });
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Episodes</p>
          <h2 className="font-heading theme-heading mt-2 text-balance text-2xl font-semibold md:text-3xl">
            Start with the first scene or jump back in
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Placeholder: seasons are not in the data model yet. */}
          <SeasonSelector />

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => scroll("left")}
              className="story-button-secondary h-11 w-11 rounded-full px-0"
              aria-label="Scroll episodes left"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              className="story-button-secondary h-11 w-11 rounded-full px-0"
              aria-label="Scroll episodes right"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
      >
        {episodes.map((episode) => (
          <div
            key={episode.id}
            className="min-w-[80%] snap-start sm:min-w-[420px] lg:min-w-[calc((100%-2rem)/3)] lg:flex-1"
          >
            <EpisodeCard episode={episode} viewer={viewer} />
          </div>
        ))}
      </div>
    </section>
  );
}
