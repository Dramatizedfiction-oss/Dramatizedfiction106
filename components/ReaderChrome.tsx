"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, MoonIcon, SunIcon } from "@/components/icons";
import { useTheme } from "@/components/providers/ThemeProvider";

/*
 * The reader's only chrome: a thin bar that steps out of the way while you
 * read (hides when scrolling down through the story, returns when scrolling
 * up, near the top or bottom, or when it holds keyboard focus). The global
 * sidebar is hidden on reader pages, so the theme switch lives here too.
 */
export default function ReaderChrome({
  backHref,
  seriesTitle,
  episodeTitle,
  children,
}: {
  backHref: string;
  seriesTitle: string;
  episodeTitle: string;
  children: React.ReactNode;
}) {
  const { resolvedTheme, setPreference } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY.current;
      const nearBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 80;
      setScrolled(y > 24);
      if (y < 120 || nearBottom || barRef.current?.contains(document.activeElement)) {
        setHidden(false);
      } else if (Math.abs(delta) > 6) {
        setHidden(delta > 0);
      }
      lastY.current = y;
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dark = resolvedTheme === "dark";

  return (
    <div className="reader-page">
      <div
        ref={barRef}
        onFocusCapture={() => setHidden(false)}
        className={`sticky top-0 z-30 border-b transition-[transform,background-color,border-color] duration-300 motion-reduce:transition-none ${
          hidden ? "-translate-y-full" : "translate-y-0"
        } ${scrolled ? "border-[var(--paper-rule)] backdrop-blur-md" : "border-transparent"}`}
        style={scrolled ? { backgroundColor: "color-mix(in srgb, var(--paper-bg) 92%, transparent)" } : undefined}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-3 md:px-6">
          <Link
            href={backHref}
            className="flex h-11 min-w-11 shrink items-center gap-2 rounded-full px-2.5 text-sm text-[var(--paper-muted)] transition hover:text-[var(--paper-ink)]"
            aria-label={`Back to ${seriesTitle}`}
          >
            <ArrowLeftIcon size={18} className="shrink-0" />
            <span className="hidden max-w-[16rem] truncate sm:inline">{seriesTitle}</span>
          </Link>

          <p
            className={`min-w-0 flex-1 truncate text-center text-sm font-semibold text-[var(--paper-ink)] transition-opacity duration-300 ${
              scrolled ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={!scrolled}
          >
            {episodeTitle}
          </p>

          <button
            type="button"
            onClick={() => setPreference(dark ? "light" : "dark")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--paper-muted)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--paper-ink)]"
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            title={dark ? "Light mode" : "Dark mode"}
          >
            {dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}
