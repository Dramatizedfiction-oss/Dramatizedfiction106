"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AppShellUser, TrendingStory } from "@/lib/navigation";
import { getUtilityItems } from "@/lib/navigation";
import GlobalSearch, {
  type SearchAuthor,
  type SearchStory,
} from "@/components/app-shell/GlobalSearch";

type AppShellProps = {
  user: (AppShellUser & { name?: string | null; image?: string | null }) | null;
  trendingStories: TrendingStory[];
  searchStories: SearchStory[];
  searchAuthors: SearchAuthor[];
  children: React.ReactNode;
};

export default function AppShell({
  user,
  trendingStories,
  searchStories,
  searchAuthors,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [trendingOpen, setTrendingOpen] = useState(true);
  const [mobileTrendingOpen, setMobileTrendingOpen] = useState(false);
  const [exploreGenre, setExploreGenre] = useState("All Genres");
  const [exploreSort, setExploreSort] = useState("Sort: Latest");
  const utilityItems = getUtilityItems();
  const profileRef = useRef<HTMLDivElement | null>(null);
  const isExploreRoute = pathname === "/explore";

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("df-theme");
    const nextTheme = storedTheme === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(nextTheme);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setMobileFiltersOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setSearchOpen(false);
        setMobileFiltersOpen(false);
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem("df-theme", nextTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(nextTheme);
  }

  const initials = (user?.name || user?.role || "DF")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border-color)] bg-[var(--header-bg)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4 md:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <Image
                  src="/logo-934.png"
                  alt="Dramatized Fiction logo"
                  fill
                  sizes="44px"
                  className="object-cover"
                  priority
                />
              </div>
              {!isExploreRoute && (
                <div>
                  <p className="eyebrow">Dramatized Fiction</p>
                  <p className="font-heading theme-heading text-2xl font-bold leading-none">
                    Stories Performed in Text
                  </p>
                </div>
              )}
            </Link>
          </div>

          <div className="hidden flex-1 justify-center px-6 md:flex">
            <div className="flex w-full max-w-[820px] items-center gap-2">
              <div className="min-w-0 flex-1">
                <GlobalSearch stories={searchStories} authors={searchAuthors} />
              </div>

              {isExploreRoute && (
                <>
                  <select
                    value={exploreGenre}
                    onChange={(event) => setExploreGenre(event.target.value)}
                    className="h-[52px] rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 text-sm text-[var(--text-primary)] outline-none"
                    aria-label="Filter by genre"
                  >
                    <option>All Genres</option>
                    <option>Fantasy</option>
                    <option>Romance</option>
                    <option>Thriller</option>
                    <option>Drama</option>
                    <option>Sci-Fi</option>
                  </select>

                  <select
                    value={exploreSort}
                    onChange={(event) => setExploreSort(event.target.value)}
                    className="h-[52px] rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 text-sm text-[var(--text-primary)] outline-none"
                    aria-label="Sort stories"
                  >
                    <option>Sort: Latest</option>
                    <option>Most Read</option>
                    <option>Recently Updated</option>
                    <option>Featured</option>
                  </select>
                </>
              )}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:opacity-80 md:hidden"
              aria-label="Open search"
            >
              Search
            </button>

            {isExploreRoute && (
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(true)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:opacity-80 md:hidden"
                aria-label="Open explore filters"
              >
                Filter
              </button>
            )}

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
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((value) => !value)}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  aria-label="Open profile menu"
                  className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)] hover:opacity-80"
                >
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.image} alt={user.name || "Profile"} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </button>

                {profileOpen && (
                  <div
                    className="theme-panel absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-[var(--border-color)] p-3 shadow-2xl"
                    role="menu"
                  >
                    <div className="rounded-2xl px-3 py-3">
                      <p className="theme-heading font-semibold">
                        {user.name || "Your profile"}
                      </p>
                      <p className="theme-meta mt-1 text-sm">
                        {user.role ? `${user.role} access` : "Authenticated reader"}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Link
                        href="/settings"
                        className="theme-panel-hover block rounded-2xl px-3 py-3 text-sm text-[var(--text-primary)] hover:opacity-80"
                      >
                        Settings
                      </Link>
                      <Link
                        href="/api/auth/signout"
                        className="theme-panel-hover block rounded-2xl px-3 py-3 text-sm text-[var(--text-primary)] hover:opacity-80"
                      >
                        Sign Out
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] hover:opacity-80 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      <GlobalSearch
        stories={searchStories}
        authors={searchAuthors}
        mode="overlay"
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

      {isExploreRoute && mobileFiltersOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={() => setMobileFiltersOpen(false)}
            aria-label="Close filters"
          />

          <div className="fixed inset-x-4 top-20 z-[60] rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 shadow-2xl md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Explore Filters</p>
                <h2 className="theme-heading mt-2 text-xl font-semibold">Refine discovery</h2>
              </div>

              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="story-button-secondary"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <select
                value={exploreGenre}
                onChange={(event) => setExploreGenre(event.target.value)}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                aria-label="Filter by genre"
              >
                <option>All Genres</option>
                <option>Fantasy</option>
                <option>Romance</option>
                <option>Thriller</option>
                <option>Drama</option>
                <option>Sci-Fi</option>
              </select>

              <select
                value={exploreSort}
                onChange={(event) => setExploreSort(event.target.value)}
                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                aria-label="Sort stories"
              >
                <option>Sort: Latest</option>
                <option>Most Read</option>
                <option>Recently Updated</option>
                <option>Featured</option>
              </select>
            </div>
          </div>
        </>
      )}

      <div className="page-shell">
        <div className="flex w-full gap-6">
          <main className="min-w-0 flex-1">
            <div className="surface-panel overflow-hidden">{children}</div>
          </main>

          <div className="hidden w-[320px] shrink-0 lg:block">
            <div className="sticky top-28">
              <UnifiedSidebar
                pathname={pathname}
                onClose={() => setMobileOpen(false)}
                onToggleTheme={toggleTheme}
                theme={theme}
                trendingStories={trendingStories}
                trendingOpen={trendingOpen}
                onToggleTrending={() => setTrendingOpen((value) => !value)}
                mobileTrendingOpen={mobileTrendingOpen}
                onToggleMobileTrending={() => setMobileTrendingOpen((value) => !value)}
                utilityItems={utilityItems}
                mobile={false}
              />
            </div>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: "var(--overlay-bg)" }}
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />

          <div className="fixed inset-y-0 right-0 z-50 w-[300px] max-w-[84vw] transform transition-transform duration-300 lg:hidden translate-x-0">
            <UnifiedSidebar
              pathname={pathname}
              onClose={() => setMobileOpen(false)}
              onToggleTheme={toggleTheme}
              theme={theme}
              trendingStories={trendingStories}
              trendingOpen={trendingOpen}
              onToggleTrending={() => setTrendingOpen((value) => !value)}
              mobileTrendingOpen={mobileTrendingOpen}
              onToggleMobileTrending={() => setMobileTrendingOpen((value) => !value)}
              utilityItems={utilityItems}
              mobile
            />
          </div>
        </>
      )}
    </div>
  );
}

function UnifiedSidebar({
  pathname,
  onClose,
  onToggleTheme,
  theme,
  trendingStories,
  trendingOpen,
  onToggleTrending,
  mobileTrendingOpen,
  onToggleMobileTrending,
  utilityItems,
  mobile,
}: {
  pathname: string;
  onClose: () => void;
  onToggleTheme: () => void;
  theme: "dark" | "light";
  trendingStories: TrendingStory[];
  trendingOpen: boolean;
  onToggleTrending: () => void;
  mobileTrendingOpen: boolean;
  onToggleMobileTrending: () => void;
  utilityItems: ReturnType<typeof getUtilityItems>;
  mobile: boolean;
}) {
  const primaryItems = [
    { href: "/explore", label: "Explore", description: "Browse the discovery feed." },
    { href: "/explore?view=for-you", label: "For You", description: "Personalized recommendations soon." },
  ];

  return (
    <aside
      className={`flex h-full flex-col border-[var(--border-color)] bg-[var(--sidebar-bg)] p-5 shadow-2xl ${
        mobile
          ? "border-l"
          : "rounded-[28px] border"
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Right Sidebar</p>
          <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">
            Discover Stories
          </h2>
          <p className="theme-meta mt-2 text-sm">
            Persistent navigation without blocking the reading surface.
          </p>
        </div>

        {mobile && (
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:opacity-80"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            Close
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <div className="space-y-4">
          <TrendingCard
            stories={trendingStories}
            open={mobile ? mobileTrendingOpen : trendingOpen}
            onToggle={mobile ? onToggleMobileTrending : onToggleTrending}
            compact={mobile}
            onNavigate={onClose}
          />

          <nav className="space-y-2">
            {primaryItems.map((item) => {
              const active = item.href.startsWith("/explore")
                ? pathname === "/explore"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`block rounded-2xl px-4 py-3 text-sm transition ${
                    active
                      ? "border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                      : "border border-transparent text-[var(--text-primary)] hover:border-[var(--border-color)] hover:opacity-80"
                  }`}
                >
                  <span className="theme-heading block font-medium">{item.label}</span>
                  <span className="theme-meta mt-1 block text-xs">
                    {item.description}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mt-6 border-t border-[var(--border-color)] pt-5 opacity-90">
        <p className="theme-meta mb-3 text-xs uppercase tracking-[0.28em]">
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
                onClick={onClose}
                className={`block rounded-2xl px-4 py-3 text-sm transition ${
                  active
                    ? "border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                    : "border border-transparent text-[var(--text-secondary)] hover:border-[var(--border-color)] hover:text-[var(--text-primary)] hover:opacity-80"
                }`}
              >
                <span className="theme-heading block font-medium">{item.label}</span>
                <span className="theme-meta mt-1 block text-xs">
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
  );
}

function TrendingCard({
  stories,
  open,
  onToggle,
  compact,
  onNavigate,
}: {
  stories: TrendingStory[];
  open: boolean;
  onToggle: () => void;
  compact: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="theme-panel rounded-[24px] border border-[var(--border-color)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Trending</p>
          <h3 className="theme-heading mt-2 text-xl font-semibold">Top 3 stories</h3>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className="rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)] hover:opacity-80"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-2">
          {stories.slice(0, 3).map((story, index) => (
            <Link
              key={story.id}
              href={`/series/${story.id}`}
              onClick={onNavigate}
              className="theme-panel theme-panel-hover block rounded-2xl border border-transparent px-4 py-3 transition hover:border-[var(--border-color)] hover:opacity-80"
            >
              <p className="theme-meta font-mono-df text-[10px] uppercase tracking-[0.28em]">
                {String(index + 1).padStart(2, "0")} | {story.reads ?? 0} reads
              </p>
              <p className="theme-heading mt-2 font-medium">{story.title}</p>
              {!compact && (
                <p className="theme-meta mt-1 line-clamp-2 text-xs">
                  {story.description || "Open this story from the trending shelf."}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
