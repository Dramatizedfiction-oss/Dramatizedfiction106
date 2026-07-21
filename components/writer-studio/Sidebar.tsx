"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AuthUser } from "@/auth";

type SectionLink = {
  href: string;
  label: string;
  description: string;
};

const storyLinks: SectionLink[] = [
  { href: "/writer-studio", label: "Workspace", description: "Create, write, and publish in one place." },
  { href: "/writer-studio/stories", label: "Stories", description: "See every draft and published episode." },
  { href: "/writer-studio/series", label: "Series", description: "Manage your story worlds." },
  { href: "/writer-studio/drafts", label: "Drafts", description: "Pick up work in progress." },
];

const referenceLinks: SectionLink[] = [
  { href: "/writer-studio/characters", label: "Characters", description: "Keep recurring people and roles organized." },
  { href: "/writer-studio/media", label: "Media", description: "Covers and visual story assets." },
];

const planningLinks: SectionLink[] = [
  { href: "/writer-studio/scheduling", label: "Schedule", description: "Plan upcoming releases." },
  { href: "/writer-studio/analytics", label: "Analytics", description: "Understand reading activity." },
  { href: "/writer-studio/settings", label: "Studio Settings", description: "Manage your creator workspace." },
];

export default function WriterStudioSidebar({
  user,
  children,
}: {
  user: AuthUser | null;
  children: React.ReactNode;
}) {
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
        collapsed ? "lg:w-[92px]" : "lg:w-[308px]"
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
        <div className="mt-5 rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
          <p className="eyebrow">Writer Studio</p>
          <h2 className="font-heading mt-2 text-2xl font-semibold text-white">
            Write first.
          </h2>
          <p className="theme-meta mt-2 text-xs leading-5">
            The manuscript is the product. Everything else supports the page.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-5 overflow-y-auto pr-1">
        <SidebarSection collapsed={collapsed} title="Story" links={storyLinks} />
        <SidebarSection collapsed={collapsed} title="Reference" links={referenceLinks} />
        <SidebarSection collapsed={collapsed} title="Planning" links={planningLinks} />

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

function SidebarSection({
  title,
  links,
  collapsed,
}: {
  title: string;
  links: SectionLink[];
  collapsed: boolean;
}) {
  return (
    <div>
      {!collapsed && (
        <div className="mb-3 px-2">
          <p className="eyebrow">{title}</p>
        </div>
      )}
      <nav className="space-y-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="theme-panel-hover block rounded-[18px] border border-[var(--border-color)] px-3 py-3 text-sm text-[var(--text-primary)]"
          >
            <span className="block">{collapsed ? link.label.slice(0, 2) : link.label}</span>
            {!collapsed && (
              <span className="theme-meta mt-1 block text-[10px] uppercase tracking-[0.2em]">
                {link.description}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
