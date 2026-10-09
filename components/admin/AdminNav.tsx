"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/administration", label: "Overview", exact: true },
  { href: "/administration/members", label: "Members" },
  { href: "/administration/analytics", label: "Analytics" },
  { href: "/administration/avatars", label: "Avatars" },
  { href: "/administration/renovation", label: "Renovation" },
  { href: "/administration/content", label: "Content" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Administration"
      className="scrollbar-hide -mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-[var(--border-color)] px-4 md:mx-0 md:px-0"
    >
      {ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative whitespace-nowrap px-4 py-3 text-sm transition ${
              active ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {item.label}
            {active ? <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[var(--accent)]" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
