import Link from "next/link";
import type { ProfileView } from "@/lib/profile-links";

/**
 * Writing | Reading on a writer's profile. Two real links (the view is in the
 * URL, so refresh, sharing and the back button work); full width on phones
 * for one-handed use, compact on wider screens.
 */
export default function ProfileViewSwitch({ basePath, current }: { basePath: string; current: ProfileView }) {
  const items: { view: ProfileView; label: string; href: string }[] = [
    { view: "writing", label: "Writing", href: basePath },
    // basePath may already carry a query (the owner's ?as=visitor preview).
    { view: "reading", label: "Reading", href: `${basePath}${basePath.includes("?") ? "&" : "?"}view=reading` },
  ];
  return (
    <nav aria-label="Profile view" className="grid grid-cols-2 gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] p-1 sm:inline-grid sm:min-w-[320px]">
      {items.map((item) => {
        const selected = item.view === current;
        return (
          <Link
            key={item.view}
            href={item.href}
            scroll={false}
            aria-current={selected ? "page" : undefined}
            className={`flex min-h-12 items-center justify-center rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))] ${
              selected
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-card)] ring-1 ring-[var(--border-strong)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
