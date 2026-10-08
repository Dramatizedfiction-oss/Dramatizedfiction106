"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppSidebar, { type AppSidebarSeries } from "@/components/app-shell/AppSidebar";
import type { SearchAuthor, SearchStory } from "@/components/app-shell/GlobalSearch";
import { useAuthSession } from "@/components/providers/AuthSessionProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { MenuIcon } from "@/components/icons";
import type { AppShellUser, StudioLink } from "@/lib/navigation";
import { getRoleLabel, hasRoleAccess, normalizeRole } from "@/lib/roles";

type AppShellProps = {
  user: (AppShellUser & { name?: string | null; image?: string | null }) | null;
  studios: StudioLink[];
  searchStories: SearchStory[];
  searchAuthors: SearchAuthor[];
  trending: AppSidebarSeries[];
  children: React.ReactNode;
};

export default function AppShell({
  user,
  studios,
  searchStories,
  searchAuthors,
  trending,
  children,
}: AppShellProps) {
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
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
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
      searchStories={searchStories}
      searchAuthors={searchAuthors}
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
    <div className="app-canvas flex min-h-screen overflow-x-hidden">
      {!isReaderRoute ? (
        <div className="hidden flex-shrink-0 md:block">
          <div className="sticky top-0 h-screen">{sidebar}</div>
        </div>
      ) : null}

      {!isReaderRoute ? (
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed z-40 flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-strong)] text-[var(--text-primary)] shadow-sm md:hidden"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 1rem)",
            left: "max(1rem, env(safe-area-inset-left))",
            background: "var(--sidebar-bg)",
            backdropFilter: "blur(8px)",
          }}
          aria-label="Open menu"
        >
          <MenuIcon size={18} />
        </button>
      ) : null}

      {mobileOpen && !isReaderRoute ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="relative h-full flex-shrink-0" style={{ width: 240 }}>
            <AppSidebar
              user={sessionUser}
              studios={studios}
              trending={trending}
              searchStories={searchStories}
              searchAuthors={searchAuthors}
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

      <div className="flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden">
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
