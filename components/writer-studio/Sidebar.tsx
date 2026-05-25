"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { AuthUser } from "@/auth";

type NavItem = {
  href: string;
  label: string;
  disabled?: boolean;
  locked?: boolean;
};

const navItems: NavItem[] = [
  { href: "/writer-studio", label: "Dashboard" },
  { href: "/writer-studio/stories", label: "Stories" },
  { href: "/writer-studio/series", label: "Series" },
  { href: "/writer-studio/drafts", label: "Drafts" },
  { href: "/writer-studio/wip-projects", label: "WIP Projects" },
  { href: "/writer-studio/media", label: "Covers & Media" },
  { href: "/writer-studio/scheduling", label: "Scheduling" },
  // TODO: Connect these once analytics, monetization, creator payouts, AI editing,
  // readability optimization, and creator economy systems are ready.
  { href: "/writer-studio/analytics", label: "Analytics", disabled: true },
  { href: "/writer-studio/monetization", label: "Monetization", disabled: true, locked: true },
  { href: "/writer-studio/settings", label: "Settings" },
];

export default function WriterStudioSidebar({
  user,
  children,
}: {
  user: AuthUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const initials = useMemo(() => {
    const seed = user?.name || user?.email || "Writer";
    return seed
      .split(/[ @]/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user?.email, user?.name]);

  const sidebar = (
    <aside
      className={`flex h-full min-h-[calc(100vh-9rem)] flex-col border-r border-[var(--border-color)] bg-[var(--sidebar-bg)]/95 p-4 transition-all duration-300 ${
        collapsed ? "lg:w-[92px]" : "lg:w-[292px]"
      }`}
    >
      <div className={`flex gap-3 ${collapsed ? "flex-col items-center" : "items-center justify-between"}`}>
        <Link
          href="/explore"
          className="group flex min-w-0 items-center gap-3 rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-3 transition hover:-translate-y-0.5 hover:border-[var(--text-secondary)]"
          onClick={() => setDrawerOpen(false)}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-primary)] text-sm text-[var(--text-primary)]">
            DF
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="theme-heading block truncate text-sm font-semibold">
                Back to Explore
              </span>
              <span className="theme-meta mt-0.5 block truncate text-xs">
                Return to the reader world
              </span>
            </span>
          )}
        </Link>

        <button
          type="button"
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] lg:inline-flex"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? "Expand Writer Studio sidebar" : "Collapse Writer Studio sidebar"}
        >
          {collapsed ? ">" : "<"}
        </button>
      </div>

      {!collapsed && (
        <Link
          href="/"
          className="theme-meta mt-3 block rounded-[16px] px-3 py-2 text-xs transition hover:bg-[var(--panel-hover)] hover:text-[var(--text-primary)]"
          onClick={() => setDrawerOpen(false)}
        >
          Home
        </Link>
      )}

      <div className="mt-6">
        {!collapsed && (
          <div className="mb-4 px-2">
            <p className="eyebrow">Writer Studio</p>
            <p className="theme-meta mt-2 text-xs leading-5">
              Build stories, organize releases, and keep your audience close.
            </p>
          </div>
        )}

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/writer-studio" && pathname.startsWith(`${item.href}/`));

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className="flex items-center justify-between gap-3 rounded-[18px] px-3 py-3 text-sm text-[var(--text-secondary)] opacity-60"
                  aria-disabled="true"
                  title={`${item.label} coming soon`}
                >
                  <span className="truncate">{collapsed ? item.label.slice(0, 2) : item.label}</span>
                  {!collapsed && (
                    <span className="rounded-full border border-[var(--border-color)] px-2 py-1 text-[10px] uppercase tracking-[0.18em]">
                      {item.locked ? "Locked" : "Soon"}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`group flex items-center justify-between gap-3 rounded-[18px] px-3 py-3 text-sm transition duration-200 ${
                  active
                    ? "bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-[inset_3px_0_0_rgba(124,58,237,0.75)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--panel-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="truncate">{collapsed ? item.label.slice(0, 2) : item.label}</span>
                {!collapsed && active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-primary)] opacity-70" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto pt-6">
        <div className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)]/70 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm font-semibold">
              {user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name || "Writer profile"} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="theme-heading truncate text-sm font-semibold">
                  {user?.name || "Creator"}
                </p>
                <p className="theme-meta mt-0.5 truncate text-xs">Creator workspace</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-[calc(100vh-8rem)] overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--panel-bg)] shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--header-bg)] px-4 py-3 lg:hidden">
        <div>
          <p className="eyebrow">Writer Studio</p>
          <p className="theme-heading mt-1 text-lg font-semibold">Creator workspace</p>
        </div>
        <button
          type="button"
          className="story-button-secondary px-4 py-2"
          onClick={() => setDrawerOpen(true)}
        >
          Menu
        </button>
      </div>

      <div className="flex">
        <div className="hidden lg:block">{sidebar}</div>
        <main className="min-w-0 flex-1 px-4 py-5 md:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      {drawerOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close Writer Studio navigation"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[320px] max-w-[88vw] lg:hidden">
            {sidebar}
          </div>
        </>
      )}
    </div>
  );
}
