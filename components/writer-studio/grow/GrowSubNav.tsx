"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GROW_SECTIONS } from "@/lib/grow/sections";

export default function GrowSubNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Grow sections" className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      {GROW_SECTIONS.map((section) => {
        const active = pathname === section.href;
        return (
          <Link
            key={section.href}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
              active
                ? "border-[var(--studio-accent)] bg-[var(--accent-soft)] text-[var(--studio-text)]"
                : "border-[var(--studio-border)] text-[var(--studio-muted)] hover:text-[var(--studio-text)]"
            }`}
          >
            {section.navLabel}
          </Link>
        );
      })}
    </nav>
  );
}
