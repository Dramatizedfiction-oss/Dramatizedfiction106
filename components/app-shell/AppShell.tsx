"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { AppShellUser, TrendingStory } from "@/lib/navigation";
import { getUtilityItems } from "@/lib/navigation";

type AppShellProps = {
  user: AppShellUser;
  trendingStories: TrendingStory[];
  children: React.ReactNode;
};

export default function AppShell({
  user,
  trendingStories,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [trendingOpen, setTrendingOpen] = useState(true);
  const [mobileTrendingOpen, setMobileTrendingOpen] = useState(false);
  const utilityItems = getUtilityItems();

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
          <UnifiedSidebar
            pathname={pathname}
            mobileOpen={mobileOpen}
            onClose={() => setMobileOpen(false)}
            onToggleTheme={toggleTheme}
            theme={theme}
            trendingStories={trendingStories}
            trendingOpen={trendingOpen}
            onToggleTrending={() => setTrendingOpen((value) => !value)}
            mobileTrendingOpen={mobileTrendingOpen}
            onToggleMobileTrending={() => setMobileTrendingOpen((value) => !value)}
            utilityItems={utilityItems}
          />

          <main className="min-w-0 flex-1">
            <div className="surface-panel overflow-hidden">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

function UnifiedSidebar({
  pathname,
  mobileOpen,
  onClose,
  onToggleTheme,
  theme,
  trendingStories,
  trendingOpen,
  onToggleTrending,
  mobileTrendingOpen,
  onToggleMobileTrending,
  utilityItems,
}: {
  pathname: string;
  mobileOpen: boolean;
  onClose: () => void;
  onToggleTheme: () => void;
  theme: "dark" | "light";
  trendingStories: TrendingStory[];
  trendingOpen: boolean;
  onToggleTrending: () => void;
  mobileTrendingOpen: boolean;
  onToggleMobileTrending: () => void;
  utilityItems: ReturnType<typeof getUtilityItems>;
}) {
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
        className={`fixed inset-y-0 left-0 z-40 flex w-[300px] max-w-[84vw] flex-col border-r border-white/10 bg-[var(--sidebar-bg)] p-5 shadow-2xl transition-transform duration-300 lg:sticky lg:top-28 lg:z-auto lg:h-[calc(100vh-8.5rem)] lg:max-h-[900px] lg:translate-x-0 lg:rounded-[28px] lg:border ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-5 flex items-start justify-between gap-3 lg:block">
          <div>
            <p className="eyebrow">Unified Sidebar</p>
            <h2 className="font-heading mt-3 text-3xl font-semibold text-white">
              Discover Stories
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              One cinematic sidebar for readers, writers, and future expansion.
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

        <div className="flex-1 overflow-y-auto pr-1">
          <div className="space-y-4">
            <TrendingCard
              stories={trendingStories}
              open={trendingOpen}
              onToggle={onToggleTrending}
              mobileOpen={mobileTrendingOpen}
              onToggleMobile={onToggleMobileTrending}
            />

            <Link
              href="/explore"
              className={`story-button-primary flex w-full items-center justify-between ${
                pathname === "/explore" ? "ring-2 ring-white/20" : ""
              }`}
            >
              <span>Discover</span>
              <span className="font-mono-df text-xs uppercase tracking-[0.2em]">Explore</span>
            </Link>

            <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-4">
              <p className="eyebrow">Reserved</p>
              <h3 className="mt-3 text-lg font-semibold text-white">Future Expansion Area</h3>
              <p className="mt-2 text-sm text-slate-400">
                Space reserved for Series, Following, Saved, and other reader collections.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">
            Platform
          </p>
          <nav className="space-y-2">
            {utilityItems.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm transition ${
                    active
                      ? "border border-white/15 bg-white/[0.08] text-white"
                      : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <span className="block font-medium">{item.label}</span>
                  <span className="mt-1 block text-xs text-slate-400">
                    {item.description}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={onToggleTheme} className="story-button-secondary text-xs">
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function TrendingCard({
  stories,
  open,
  onToggle,
  mobileOpen,
  onToggleMobile,
}: {
  stories: TrendingStory[];
  open: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
}) {
  return (
    <>
      <div className="hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-4 lg:block">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Trending</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Top stories right now</h3>
          </div>

          <button
            type="button"
            onClick={onToggle}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/75"
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>

        {open && (
          <div className="mt-4 space-y-2">
            {stories.map((story, index) => (
              <Link
                key={story.id}
                href={`/series/${story.id}`}
                className="block rounded-2xl border border-transparent bg-white/[0.03] px-4 py-3 transition hover:border-white/10 hover:bg-white/[0.06]"
              >
                <p className="font-mono-df text-[10px] uppercase tracking-[0.28em] text-white/35">
                  {String(index + 1).padStart(2, "0")} | {story.reads ?? 0} reads
                </p>
                <p className="mt-2 font-medium text-white">{story.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                  {story.description || "Open this story from the trending shelf."}
                </p>
              </Link>
            ))}

            <Link href="/explore?view=trending" className="story-button-secondary mt-2 w-full">
              View All Trending
            </Link>
          </div>
        )}
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 lg:hidden">
        <button
          type="button"
          onClick={onToggleMobile}
          className="flex w-full items-center justify-between gap-3"
        >
          <div className="text-left">
            <p className="eyebrow">Trending</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Top 3 stories</h3>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/75">
            {mobileOpen ? "Hide" : "Show"}
          </span>
        </button>

        {mobileOpen && (
          <div className="mt-4 space-y-2">
            {stories.map((story, index) => (
              <Link
                key={story.id}
                href={`/series/${story.id}`}
                className="block rounded-2xl border border-transparent bg-white/[0.03] px-4 py-3 transition hover:border-white/10 hover:bg-white/[0.06]"
              >
                <p className="font-mono-df text-[10px] uppercase tracking-[0.28em] text-white/35">
                  {String(index + 1).padStart(2, "0")} | {story.reads ?? 0} reads
                </p>
                <p className="mt-2 font-medium text-white">{story.title}</p>
              </Link>
            ))}

            <Link href="/explore?view=trending" className="story-button-secondary mt-2 w-full">
              Explore Trending
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
