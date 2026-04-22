"use client";

import Link from "next/link";
import { useRef } from "react";

type CarouselItem = {
  id: string;
  title: string;
  description?: string | null;
};

type CarouselProps = {
  title: string;
  items: CarouselItem[];
};

export default function Carousel({ title, items }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = direction === "left" ? -320 : 320;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Curated Shelf</p>
          <h2 className="font-heading theme-heading mt-2 text-3xl font-semibold">{title}</h2>
        </div>

        <div className="hidden gap-2 md:flex">
          <button
            onClick={() => scroll("left")}
            className="story-button-secondary h-11 w-11 rounded-full px-0"
          >
            ‹
          </button>
          <button
            onClick={() => scroll("right")}
            className="story-button-secondary h-11 w-11 rounded-full px-0"
          >
            ›
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="scrollbar-hide flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/series/${item.id}`}
            className="glass-panel theme-panel-hover min-w-[260px] rounded-[24px] border border-[var(--border-color)] p-5 transition hover:opacity-80"
          >
            <p className="eyebrow">Series</p>
            <h3 className="theme-heading mt-3 text-xl font-semibold">{item.title}</h3>
            <p className="theme-meta mt-3 text-sm">
              {item.description || "No description yet."}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
