"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppSidebar, { type AppSidebarSeries } from "@/components/app-shell/AppSidebar";
import ProfileMenu from "@/components/app-shell/ProfileMenu";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { BookOpenIcon, MenuIcon, SearchIcon } from "@/components/icons";
import type { AppShellUser, StudioLink } from "@/lib/navigation";
import { getRoleLabel, hasRoleAccess, normalizeRole } from "@/lib/roles";

type AppShellProps = {
  user: (AppShellUser & { name?: string | null; image?: string | null }) | null;
  studios: StudioLink[];
  trending: AppSidebarSeries[];
  children: React.ReactNode;
};

export default function AppShell({ user, studios, trending, children }: AppShellProps) {
  const { session, status, signOut } = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { resolvedTheme: theme, setPreference } = useTheme();
  const sessionUser = status === "loading" ? session?.user ?? user ?? null : session?.user ?? null;
  const canWrite = hasRoleAccess(sessionUser?.role, "WRITER");
  const canManage = hasRoleAccess(sessionUser?.role, "BOARD");
  const canAccessCEO = hasRoleAccess(sessionUser?.role, "CEO");
  const roleLabel = getRoleLabel(normalizeRole(sessionUser?.role));
  // The reader and the Writer Studio focus screens (editor, preview, publish)
  // replace the global chrome with their own top bar.
  const isStudioFocusRoute = /^\/writer-studio\/episodes\/(?!new(?:\/|$))[^/]+/.test(pathname);
  const isReaderRoute = pathname.startsWith("/episode/") || isStudioFocusRoute;
  const isFlushRoute =
    pathname === "/" ||
    pathname.startsWith("/explore") ||
    pathname.startsWith("/episode") ||
    pathname.startsWith("/writer-studio") ||
    pathname.startsWith("/writer") ||
    pathname.startsWith("/ceo");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  // Quick switch in the sidebar: an explicit choice, so it overrides "system".
  // Settings offers Light / Dark / System.
  function toggleTheme() {
    setPreference(theme === "dark" ? "light" : "dark");
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    setMobileOpen(false);
    await signOut();
    router.refresh();
    router.push("/");
  }

  const sidebar = (
    <AppSidebar
      user={sessionUser}
      studios={studios}
      trending={trending}
      expanded={expanded}
      theme={theme}
      roleLabel={roleLabel}
      canWrite={canWrite}
      canManage={canManage}
      canAccessCEO={canAccessCEO}
      isSigningOut={isSigningOut}
      onToggleExpanded={() => setExpanded((value) => !value)}
      onToggleTheme={toggleTheme}
      onSignOut={handleSignOut}
    />
  );

  return (
    // overflow-x-clip (never overflow-x-hidden) on this root and the content
    // column: "hidden" turns the element into a scroll container, which makes
    // the sticky rail below stick to it instead of the viewport, so the
    // sidebar scrolled away and appeared to end partway down long pages.
    <div className="app-canvas flex min-h-screen overflow-x-clip">
      {!isReaderRoute ? (
        <div className="hidden flex-shrink-0 md:block">
          <div className="sticky top-0 h-screen">{sidebar}</div>
        </div>
      ) : null}

      {mobileOpen && !isReaderRoute ? (
        <div id="mobile-nav" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex md:hidden">
          <div className="relative h-full flex-shrink-0" style={{ width: "min(280px, 85vw)" }}>
            <AppSidebar
              user={sessionUser}
              studios={studios}
              trending={trending}
              expanded
              isMobile
              theme={theme}
              roleLabel={roleLabel}
              canWrite={canWrite}
              canManage={canManage}
              canAccessCEO={canAccessCEO}
              isSigningOut={isSigningOut}
              onToggleExpanded={() => undefined}
              onClose={() => setMobileOpen(false)}
              onToggleTheme={toggleTheme}
              onSignOut={handleSignOut}
            />
          </div>
          <button type="button" className="flex-1 bg-[var(--overlay-bg)]" onClick={() => setMobileOpen(false)} aria-label="Close menu" />
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-clip">
        {!isReaderRoute ? (
          <header
            className="sticky top-0 z-40 flex h-14 items-center gap-1 border-b border-[var(--border-color)] px-2 md:hidden"
            style={{ background: "var(--header-bg)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
          >
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-primary)] transition hover:bg-[var(--panel-hover)]"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              <MenuIcon size={20} />
            </button>
            <Link href="/" className="flex min-w-0 items-center gap-2 px-1 py-2" aria-label="Dramatized Fiction home">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm"
                style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
              >
                <BookOpenIcon size={13} className="text-white" />
              </span>
              <span className="truncate font-mono-df text-xs uppercase tracking-widest text-[var(--text-secondary)]">
                Dramatized
              </span>
            </Link>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {/* Search lives on Explore; this opens it with the search box focused. */}
              <Link
                href="/explore?focus=search"
                className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-primary)] transition hover:bg-[var(--panel-hover)]"
                aria-label="Search stories"
              >
                <SearchIcon size={19} />
              </Link>
              {sessionUser ? (
                <ProfileMenu
                  user={sessionUser}
                  roleLabel={roleLabel}
                  hasPublicProfile={canWrite}
                  isSigningOut={isSigningOut}
                  onSignOut={handleSignOut}
                  variant="header"
                />
              ) : (
                <Link href="/sign-in" className="story-button-secondary px-4 py-2">
                  Sign in
                </Link>
              )}
            </div>
          </header>
        ) : null}
        <main className={isFlushRoute ? "flex-1" : "page-shell flex-1"}>{children}</main>
        {!isReaderRoute ? (
          <footer className="border-t border-[var(--border-color)] px-6 py-8">
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="font-mono-df text-xs uppercase tracking-widest text-[var(--text-muted)]">
                Dramatized Fiction
              </p>
              <p className="text-xs text-[var(--text-muted)]">Stories performed in text</p>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
