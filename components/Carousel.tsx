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
    const amount = direction === "left" ? -300 : 300;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>

      <div className="relative">
        {/* Left Button */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-slate-900/70 px-3 py-2 rounded hover:bg-slate-800 z-10"
        >
          ‹
        </button>

        {/* Scroll Container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/series/${item.id}`}
              className="min-w-[200px] bg-slate-900 border border-slate-800 rounded-lg p-4 hover:bg-slate-800 transition"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-slate-400 text-sm">
                {item.description || "No description yet."}
              </p>
            </Link>
          ))}
        </div>

        {/* Right Button */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-slate-900/70 px-3 py-2 rounded hover:bg-slate-800 z-10"
        >
          ›
        </button>
      </div>
    </section>
  );
}
