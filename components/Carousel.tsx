"use client";

import Link from "next/link";
import { useRef } from "react";

export default function Carousel({ title, items }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
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
              <p className="text-slate-400 text-sm">{item.description}</p>
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
