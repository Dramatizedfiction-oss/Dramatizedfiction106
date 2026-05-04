"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const writerNav = [
  { href: "/writer", label: "Dashboard", description: "Overview and recent momentum" },
  { href: "/writer/series", label: "Series", description: "Shape and organize story worlds" },
  { href: "/writer/episodes", label: "Episodes", description: "Manage published and draft scenes" },
  { href: "/writer/stats", label: "Stats", description: "Track reads and platform reach" },
  { href: "/writer/guidelines", label: "Guidelines", description: "Trust, policy, and craft guardrails" },
];

export default function WriterStudioShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="px-4 py-6 md:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass-panel rounded-[28px] border border-[var(--border-color)] p-5">
          <p className="eyebrow">Writer Studio</p>
          <h1 className="font-heading theme-heading mt-3 text-3xl font-semibold">
            Creative workspace
          </h1>
          <p className="theme-meta mt-3 text-sm leading-6">
            A focused home for drafting, packaging, and publishing story worlds.
          </p>

          <nav className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {writerNav.map((item) => {
              const active = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[20px] border px-4 py-4 transition ${
                    active
                      ? "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                      : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <p className="theme-heading text-sm font-semibold">{item.label}</p>
                  <p className="theme-meta mt-2 text-xs leading-5">{item.description}</p>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="glass-panel rounded-[28px] border border-[var(--border-color)] p-6 md:p-8">
          {children}
        </section>
      </div>
    </div>
  );
}
