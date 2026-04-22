"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ReaderChromeProps = {
  backHref: string;
  episodeTitle: string;
  children: React.ReactNode;
};

export default function ReaderChrome({
  backHref,
  episodeTitle,
  children,
}: ReaderChromeProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen">
      <div
        className={`sticky top-0 z-30 border-b border-[var(--border-color)] transition-all duration-300 ${
          scrolled ? "bg-[var(--header-bg)]/90 backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 md:px-8">
          <Link href={backHref} className="story-button-secondary text-xs sm:text-sm">
            Back to Series
          </Link>

          <p
            className={`theme-heading max-w-[420px] truncate text-center text-sm font-medium transition-opacity duration-300 sm:text-base ${
              scrolled ? "opacity-100" : "opacity-75"
            }`}
          >
            {episodeTitle}
          </p>

          <button type="button" className="story-button-secondary text-xs sm:text-sm">
            Bookmark
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}
