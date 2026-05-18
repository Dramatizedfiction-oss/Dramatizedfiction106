"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/writer-studio/series", label: "Series" },
  { href: "/writer-studio/analytics", label: "Analytics" },
  { href: "/writer-studio/notifications", label: "Notifications" },
];

export default function WriterStudioTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
              active
                ? "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
