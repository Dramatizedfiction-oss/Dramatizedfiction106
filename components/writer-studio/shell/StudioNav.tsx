"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/writer-studio", label: "Home", exact: true },
  { href: "/writer-studio/series", label: "Series" },
  { href: "/writer-studio/episodes", label: "Episodes" },
  { href: "/writer-studio/stats", label: "Stats" },
  { href: "/writer-studio/grow", label: "Grow" },
  { href: "/writer-studio/guidelines", label: "Guidelines" },
];

export default function StudioNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Writer Studio"
      className="scrollbar-hide -mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-[var(--studio-border)] px-4 md:mx-0 md:px-0"
    >
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`relative whitespace-nowrap px-4 py-3 text-sm transition ${
              active
                ? "text-[var(--studio-text)]"
                : "text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
            }`}
          >
            {tab.label}
            {active ? (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[var(--studio-accent)]" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
