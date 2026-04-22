"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AppShellUser, NavigationItem } from "@/lib/navigation";
import { getNavigationItems } from "@/lib/navigation";

type AppShellProps = {
  user: AppShellUser;
  children: React.ReactNode;
};

export default function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const items = useMemo(() => getNavigationItems(user), [user]);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("df-theme");
    const nextTheme = storedTheme === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("light", nextTheme === "light");
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("df-theme", nextTheme);
    document.documentElement.classList.toggle("light", nextTheme === "light");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/55 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm text-white lg:hidden"
              onClick={() => setMobileOpen((value) => !value)}
            >
              Menu
            </button>

            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-white">
                DF
              </div>
              <div>
                <p className="eyebrow">Dramatized Fiction</p>
                <p className="font-heading text-2xl font-bold leading-none text-white">
                  Stories Performed in Text
                </p>
              </div>
            </Link>
          </div>

          <div className="hidden min-w-[180px] flex-1 items-center justify-center md:flex">
            <button
              type="button"
              className="w-full max-w-md rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-slate-400 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              Search stories, series, and creators
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="story-button-secondary hidden sm:inline-flex"
            >
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>

            {!user ? (
              <Link href="/api/auth/signin" className="story-button-primary">
                Sign In
              </Link>
            ) : (
              <Link href="/api/auth/signout" className="story-button-secondary">
                Sign Out
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="page-shell">
        <div className="flex flex-col gap-6 lg:flex-row">
          <ShellSidebar
            items={items}
            pathname={pathname}
            mobileOpen={mobileOpen}
            onClose={() => setMobileOpen(false)}
            onToggleTheme={toggleTheme}
            theme={theme}
          />

          <main className="min-w-0 flex-1">
            <div className="surface-panel overflow-hidden">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

function ShellSidebar({
  items,
  pathname,
  mobileOpen,
  onClose,
  onToggleTheme,
  theme,
}: {
  items: NavigationItem[];
  pathname: string;
  mobileOpen: boolean;
  onClose: () => void;
  onToggleTheme: () => void;
  theme: "dark" | "light";
}) {
  const sections = [
    { key: "discover", label: "Discover" },
    { key: "writer", label: "Writer Studio" },
    { key: "ceo", label: "CEO Studio" },
  ] as const;

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[290px] max-w-[80vw] border-r border-white/10 bg-[var(--sidebar-bg)] p-5 shadow-2xl transition-transform duration-300 lg:sticky lg:top-28 lg:z-auto lg:block lg:h-fit lg:translate-x-0 lg:rounded-[28px] lg:border ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-start justify-between gap-3 lg:block">
          <div>
            <p className="eyebrow">Global Shell</p>
            <h2 className="font-heading mt-3 text-3xl font-semibold text-white">
              App Navigation
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              One consistent layout system for reading, publishing, and platform control.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white lg:hidden"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {sections.map((section) => {
            const sectionItems = items.filter((item) => item.section === section.key);

            if (sectionItems.length === 0) return null;

            return (
              <div key={section.key}>
                <p className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">
                  {section.label}
                </p>
                <nav className="space-y-2">
                  {sectionItems.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                          active
                            ? "border border-white/15 bg-white/[0.08] text-white"
                            : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            );
          })}
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">
            Utility
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onToggleTheme} className="story-button-secondary text-xs">
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button type="button" className="story-button-secondary text-xs">
              Info
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
