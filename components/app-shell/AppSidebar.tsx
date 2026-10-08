"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import GlobalSearch, {
  type SearchAuthor,
  type SearchStory,
} from "@/components/app-shell/GlobalSearch";
import {
  BookOpenIcon,
  CompassIcon,
  FeatherIcon,
  HomeIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  TrendingUpIcon,
  UserIcon,
  ChevronRightIcon,
} from "@/components/icons";
import type { StudioLink } from "@/lib/navigation";
import { safeHexColor } from "@/lib/writer-studio/format";

export type AppSidebarSeries = {
  id: string;
  title: string;
  genre?: string | null;
  reads: number;
  themeColor?: string | null;
};

type AppSidebarProps = {
  user: { name?: string | null; image?: string | null; role?: string | null } | null;
  studios: StudioLink[];
  trending: AppSidebarSeries[];
  searchStories: SearchStory[];
  searchAuthors: SearchAuthor[];
  expanded: boolean;
  isMobile?: boolean;
  theme: "dark" | "light";
  roleLabel: string;
  canWrite: boolean;
  canManage: boolean;
  canAccessCEO: boolean;
  isSigningOut: boolean;
  onToggleExpanded: () => void;
  onClose?: () => void;
  onToggleTheme: () => void;
  onSignOut: () => void;
};

// Gold / silver / bronze, tuned per theme in globals.css.
const RANK_COLORS = ["var(--rank-1)", "var(--rank-2)", "var(--rank-3)"];

export default function AppSidebar({
  user,
  studios,
  trending,
  searchStories,
  searchAuthors,
  expanded,
  isMobile = false,
  theme,
  roleLabel,
  canWrite,
  canManage,
  canAccessCEO,
  isSigningOut,
  onToggleExpanded,
  onClose,
  onToggleTheme,
  onSignOut,
}: AppSidebarProps) {
  const pathname = usePathname();
  const [hoveredSeries, setHoveredSeries] = useState<string | null>(null);
  const showLabels = isMobile || expanded;

  function navClass(active: boolean) {
    return `sidebar-link ${active ? "sidebar-link-active" : ""}`;
  }

  return (
    <aside
      className="relative flex h-full flex-shrink-0 flex-col overflow-hidden border-r border-[var(--border-color)]"
      style={{
        width: showLabels ? 240 : 64,
        background: "var(--sidebar-bg)",
        transition: "width 280ms ease",
      }}
    >
      {!isMobile ? (
        <button
          type="button"
          onClick={onToggleExpanded}
          className="absolute right-3 top-6 z-10 flex h-6 w-6 items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          <span style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", display: "inline-flex", transition: "transform 280ms ease" }}>
            <ChevronRightIcon size={14} />
          </span>
        </button>
      ) : null}

      <div className="flex min-h-[72px] items-center gap-3 px-4 pb-8 pt-6">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm"
          style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
        >
          <BookOpenIcon size={14} className="text-white" />
        </div>
        {showLabels ? (
          <span className="whitespace-nowrap font-mono-df text-xs uppercase tracking-widest text-[var(--text-secondary)]">
            Dramatized
          </span>
        ) : null}
      </div>

      <nav className="space-y-1 px-2">
        <Link href="/" onClick={onClose} className={navClass(pathname === "/")}>
          <HomeIcon size={16} className="flex-shrink-0" />
          {showLabels ? <span>Home</span> : null}
        </Link>
        <Link href="/explore" onClick={onClose} className={navClass(pathname.startsWith("/explore"))}>
          <CompassIcon size={16} className="flex-shrink-0" />
          {showLabels ? <span>Explore</span> : null}
        </Link>
        {canWrite ? (
          <Link
            href="/writer-studio"
            onClick={onClose}
            className={navClass(pathname.startsWith("/writer-studio") || pathname.startsWith("/writer"))}
          >
            <span className="w-4 text-center text-xs">✍️</span>
            {showLabels ? <span>Writer Studio</span> : null}
          </Link>
        ) : user ? (
          <Link
            href="/become-author"
            onClick={onClose}
            className={`sidebar-link ${pathname === "/become-author" ? "sidebar-link-active" : "text-[var(--accent)] hover:bg-[var(--accent-soft)]"}`}
          >
            <FeatherIcon size={16} className="flex-shrink-0" />
            {showLabels ? <span>Become Author</span> : null}
          </Link>
        ) : null}
        {canAccessCEO ? (
          <Link
            href="/ceo-studio"
            onClick={onClose}
            className={navClass(pathname.startsWith("/ceo"))}
          >
            <span className="w-4 text-center text-xs">👑</span>
            {showLabels ? <span>CEO Studio</span> : null}
          </Link>
        ) : null}
        {canManage ? (
          <Link
            href="/command-center"
            onClick={onClose}
            className={navClass(pathname.startsWith("/command-center"))}
          >
            <span className="w-4 text-center text-xs">⌘</span>
            {showLabels ? <span>Command Center</span> : null}
          </Link>
        ) : null}
      </nav>

      {showLabels ? (
        <div className="px-3 pb-2 pt-4">
          <GlobalSearch stories={searchStories} authors={searchAuthors} />
        </div>
      ) : null}

      <div className="mb-3 mt-6 flex items-center gap-2 px-4">
        {!showLabels ? (
          <TrendingUpIcon size={14} className="flex-shrink-0 text-[var(--text-muted)]" />
        ) : (
          <>
            <TrendingUpIcon size={11} className="flex-shrink-0 text-[var(--accent)]" />
            <p className="font-mono-df text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
              Trending This Week
            </p>
          </>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {trending.map((series, idx) => {
          const accent = safeHexColor(series.themeColor);
          const rankColor = RANK_COLORS[idx] || RANK_COLORS[2];
          const active = pathname === `/series/${series.id}`;
          const hovered = hoveredSeries === series.id;

          return (
            <Link
              key={series.id}
              href={`/series/${series.id}`}
              onClick={onClose}
              onMouseEnter={() => setHoveredSeries(series.id)}
              onMouseLeave={() => setHoveredSeries(null)}
              className="relative flex items-center gap-3 overflow-hidden rounded-md px-3 py-2.5"
            >
              {hovered ? (
                <span
                  className="absolute inset-0 rounded-md"
                  style={{ background: `radial-gradient(ellipse at left, ${accent}22 0%, transparent 70%)` }}
                />
              ) : null}
              <span
                className="relative z-10 w-4 flex-shrink-0 text-center font-mono-df text-[10px] font-bold"
                style={{ color: rankColor }}
              >
                #{idx + 1}
              </span>
              {showLabels ? (
                <span className="relative z-10 min-w-0 flex-1">
                  <span
                    className="block truncate text-sm leading-tight"
                    style={{
                      color: active || hovered ? "var(--text-primary)" : "var(--text-secondary)",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {series.title}
                  </span>
                  <span className="mt-0.5 block font-mono-df text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {series.reads > 0 ? `${series.reads.toLocaleString()} reads` : "New"}
                  </span>
                </span>
              ) : null}
            </Link>
          );
        })}
        {trending.length === 0 && showLabels ? (
          <p className="px-3 py-2 font-mono-df text-[11px] text-[var(--text-muted)]">No series yet.</p>
        ) : null}
      </div>

      <div className="space-y-1 border-t border-[var(--border-color)] px-2 pb-4 pt-3">
        {showLabels && studios.length > 0 ? (
          <div className="px-2 pb-2">
            <p className="mb-1 font-mono-df text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Studios</p>
            {studios.slice(0, 3).map((studio) => (
              <Link
                key={studio.id}
                href={`/writer-studio?studio=${studio.slug}`}
                onClick={onClose}
                className="block truncate rounded-md px-2 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {studio.name}
              </Link>
            ))}
          </div>
        ) : null}

        <Link href="/settings" onClick={onClose} className={navClass(pathname === "/settings")}>
          <SettingsIcon size={16} className="flex-shrink-0" />
          {showLabels ? <span>Settings</span> : null}
        </Link>

        <button type="button" onClick={onToggleTheme} className="sidebar-link w-full">
          {theme === "dark" ? <SunIcon size={16} className="flex-shrink-0" /> : <MoonIcon size={16} className="flex-shrink-0" />}
          {showLabels ? <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span> : null}
        </button>

        {!user ? (
          <Link href="/sign-in" onClick={onClose} className="sidebar-link">
            <UserIcon size={16} className="flex-shrink-0" />
            {showLabels ? <span>Sign In</span> : null}
          </Link>
        ) : (
          <>
            {showLabels ? (
              <div className="rounded-md px-3 py-2">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">{user.name || "Member"}</p>
                <p className="font-mono-df text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{roleLabel}</p>
              </div>
            ) : null}
            <button type="button" onClick={onSignOut} disabled={isSigningOut} className="sidebar-link w-full">
              <UserIcon size={16} className="flex-shrink-0" />
              {showLabels ? <span>{isSigningOut ? "Signing Out" : "Sign Out"}</span> : null}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
