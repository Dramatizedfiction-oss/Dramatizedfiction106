"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import ProfileMenu from "@/components/app-shell/ProfileMenu";
import {
  BookOpenIcon,
  ChevronRightIcon,
  CloseIcon,
  CompassIcon,
  CrownIcon,
  FeatherIcon,
  HomeIcon,
  MoonIcon,
  PenIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
  TrendingUpIcon,
  UserIcon,
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
  user: { id?: string | null; name?: string | null; image?: string | null; role?: string | null } | null;
  studios: StudioLink[];
  trending: AppSidebarSeries[];
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

function NavItem({
  href,
  label,
  icon,
  active,
  accent = false,
  showLabels,
  onClose,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  accent?: boolean;
  showLabels: boolean;
  onClose?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      aria-current={active ? "page" : undefined}
      aria-label={showLabels ? undefined : label}
      title={showLabels ? undefined : label}
      className={`sidebar-link ${showLabels ? "" : "justify-center px-0"} ${
        active ? "sidebar-link-active" : accent ? "text-[var(--accent)]" : ""
      }`}
    >
      {icon}
      {showLabels ? <span className="truncate">{label}</span> : null}
    </Link>
  );
}

// Gold / silver / bronze, tuned per theme in globals.css.
const RANK_COLORS = ["var(--rank-1)", "var(--rank-2)", "var(--rank-3)"];

/*
 * The global navigation: the desktop rail (expanded or collapsed) and, with
 * `isMobile`, the contents of the phone menu drawer. Layout top to bottom:
 * brand + collapse control, main links, theme switch, trending, account.
 * Role-based links are visibility only; each destination checks access on
 * the server.
 */
export default function AppSidebar({
  user,
  studios,
  trending,
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
  const item = { showLabels, onClose };
  const themeLabel = theme === "dark" ? "Light mode" : "Dark mode";

  return (
    <aside
      aria-label="Site navigation"
      className={`relative flex h-full flex-shrink-0 flex-col border-r border-[var(--border-color)] ${
        // The mobile drawer scrolls as a whole so the account controls stay
        // reachable on short screens; the desktop rail clips.
        isMobile ? "overflow-y-auto overscroll-contain" : "overflow-hidden"
      }`}
      style={{
        width: isMobile ? "100%" : showLabels ? 240 : 64,
        background: "var(--sidebar-bg)",
        transition: "width 280ms ease",
      }}
    >
      {/* Brand and the expand/collapse (desktop) or close (mobile) control. */}
      <div
        className={
          showLabels
            ? `flex min-h-[72px] items-center gap-3 ${isMobile ? "py-3 pl-4 pr-2" : "pb-6 pl-4 pr-2 pt-5"}`
            : "flex flex-col items-center gap-3 pb-5 pt-5"
        }
      >
        <Link href="/" onClick={onClose} className="flex min-h-11 min-w-0 items-center gap-3" aria-label="Dramatized Fiction home">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm"
            style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
          >
            <BookOpenIcon size={14} className="text-white" />
          </span>
          {showLabels ? (
            <span className="whitespace-nowrap font-mono-df text-xs uppercase tracking-widest text-[var(--text-secondary)]">
              Dramatized
            </span>
          ) : null}
        </Link>
        {isMobile ? (
          onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--text-primary)]"
              aria-label="Close menu"
            >
              <CloseIcon size={20} />
            </button>
          ) : null
        ) : (
          <button
            type="button"
            onClick={onToggleExpanded}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--text-primary)] ${
              showLabels ? "ml-auto" : ""
            }`}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={expanded}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <span
              className="inline-flex"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 280ms ease" }}
            >
              <ChevronRightIcon size={16} />
            </span>
          </button>
        )}
      </div>

      <nav aria-label="Main" className="space-y-1 px-2">
        <NavItem
          {...item}
          href="/"
          label="Home"
          icon={<HomeIcon size={16} className="flex-shrink-0" />}
          active={pathname === "/"}
        />
        <NavItem
          {...item}
          href="/explore"
          label="Explore"
          icon={<CompassIcon size={16} className="flex-shrink-0" />}
          active={pathname.startsWith("/explore")}
        />
        {canWrite ? (
          <NavItem
            {...item}
            href="/writer-studio"
            label="Writer Studio"
            icon={<PenIcon size={16} className="flex-shrink-0" />}
            active={pathname.startsWith("/writer-studio") || pathname.startsWith("/writer")}
          />
        ) : user ? (
          <NavItem
            {...item}
            href="/become-author"
            label="Become Author"
            icon={<FeatherIcon size={16} className="flex-shrink-0" />}
            active={pathname === "/become-author"}
            accent
          />
        ) : null}
        {canAccessCEO ? (
          <NavItem
            {...item}
            href="/ceo-studio"
            label="CEO Studio"
            icon={<CrownIcon size={16} className="flex-shrink-0" />}
            active={pathname.startsWith("/ceo")}
          />
        ) : null}
        {canManage ? (
          <NavItem
            {...item}
            href="/command-center"
            label="Command Center"
            icon={<ShieldIcon size={16} className="flex-shrink-0" />}
            active={pathname.startsWith("/command-center")}
          />
        ) : null}

        {/* Quick theme switch (an explicit choice; Settings also offers "System"). */}
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={showLabels ? undefined : themeLabel}
          title={showLabels ? undefined : themeLabel}
          className={`sidebar-link w-full ${showLabels ? "" : "justify-center px-0"}`}
        >
          {theme === "dark" ? <SunIcon size={16} className="flex-shrink-0" /> : <MoonIcon size={16} className="flex-shrink-0" />}
          {showLabels ? <span>{themeLabel}</span> : null}
        </button>
      </nav>

      <div className={`mb-2 mt-6 flex items-center gap-2 ${showLabels ? "px-4" : "justify-center"}`}>
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

      <div className={`flex-1 space-y-1 px-2 pb-4 ${isMobile ? "" : "overflow-y-auto"}`}>
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
              aria-current={active ? "page" : undefined}
              aria-label={showLabels ? undefined : `Trending #${idx + 1}: ${series.title}`}
              title={showLabels ? undefined : series.title}
              className={`relative flex items-center gap-3 overflow-hidden rounded-md py-2.5 ${
                showLabels ? "px-3" : "justify-center px-0"
              }`}
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

      {/* Account area. */}
      <div className={`border-t border-[var(--border-color)] pb-4 pt-3 ${showLabels ? "px-3" : "px-2"}`}>
        {showLabels && studios.length > 0 ? (
          <div className="pb-3">
            <p className="mb-1 px-1 font-mono-df text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Studios</p>
            {studios.slice(0, 3).map((studio) => (
              <Link
                key={studio.id}
                href={`/writer-studio?studio=${studio.slug}`}
                onClick={onClose}
                className={`block truncate rounded-md px-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] ${
                  isMobile ? "py-3" : "py-1.5"
                }`}
              >
                {studio.name}
              </Link>
            ))}
          </div>
        ) : null}

        {user ? (
          <div className={showLabels ? "" : "flex justify-center"}>
            <ProfileMenu
              user={user}
              roleLabel={roleLabel}
              hasPublicProfile={canWrite}
              isSigningOut={isSigningOut}
              onSignOut={onSignOut}
              onNavigate={onClose}
              variant={showLabels ? "card" : "rail"}
            />
          </div>
        ) : showLabels ? (
          <div className="space-y-2">
            <Link href="/sign-in" onClick={onClose} className="story-button-primary w-full">
              Sign in
            </Link>
            <div className="flex items-center justify-between gap-2 px-1">
              <Link
                href="/sign-up"
                onClick={onClose}
                className="py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                Create account
              </Link>
              <Link
                href="/settings"
                onClick={onClose}
                className="flex items-center gap-1.5 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              >
                <SettingsIcon size={14} />
                Settings
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <NavItem
              {...item}
              href="/sign-in"
              label="Sign in"
              icon={<UserIcon size={16} className="flex-shrink-0" />}
              active={pathname === "/sign-in"}
            />
            <NavItem
              {...item}
              href="/settings"
              label="Settings"
              icon={<SettingsIcon size={16} className="flex-shrink-0" />}
              active={pathname === "/settings"}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
