"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppShellUser } from "@/lib/navigation";
import GlobalSearch, {
  type SearchAuthor,
  type SearchStory,
} from "@/components/app-shell/GlobalSearch";

type AppShellProps = {
  user: (AppShellUser & { name?: string | null; image?: string | null }) | null;
  searchStories: SearchStory[];
  searchAuthors: SearchAuthor[];
  children: React.ReactNode;
};

export default function AppShell({
  user,
  searchStories,
  searchAuthors,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const profileRef = useRef<HTMLDivElement | null>(null);
  const mobileNavRef = useRef<HTMLDivElement | null>(null);
  const isExploreRoute = pathname === "/explore";
  const canWrite =
    user?.role === "AUTHOR" || user?.role === "ADMIN" || user?.role === "CEO";
  const canManage = user?.role === "ADMIN" || user?.role === "CEO";

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("df-theme");
    const nextTheme = storedTheme === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(nextTheme);
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setProfileOpen(false);
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (!profileRef.current?.contains(target)) {
        setProfileOpen(false);
      }

      if (!mobileNavRef.current?.contains(target)) {
        setMobileNavOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setProfileOpen(false);
        setMobileNavOpen(false);
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

  const initials = useMemo(() => {
    const seed = user?.name || user?.role || "DF";
    return seed
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name, user?.role]);

  const discoveryLinks = [
    { href: "/explore", label: "Explore", description: "Main story feed." },
    {
      href: "/explore?view=for-you",
      label: "For You",
      description: "Future recommendation shelf.",
    },
    {
      href: "/write-with-us",
      label: "Start Writing With Us",
      description: "Writer onboarding and application flow.",
    },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border-color)] bg-[var(--header-bg)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-8">
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
            <div>
              <p className="eyebrow">Dramatized Fiction</p>
              <p className="font-heading theme-heading text-2xl font-bold leading-none">
                Stories Performed in Text
              </p>
            </div>
          </Link>

          <div className="hidden flex-1 justify-center px-4 md:flex">
            <div className="w-full max-w-[820px]">
              <GlobalSearch stories={searchStories} authors={searchAuthors} />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:opacity-80 md:hidden"
              aria-label="Open search"
            >
              Search
            </button>

            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((value) => !value)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                aria-label="Open profile menu"
                className="inline-flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)] hover:opacity-80"
              >
                {user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name || "Profile"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </button>

              {profileOpen && (
                <div
                  className="glass-panel absolute right-0 top-full z-50 mt-2 w-64 rounded-[24px] border border-[var(--border-color)] p-2 shadow-2xl"
                  role="menu"
                >
                  <div className="rounded-[18px] px-3 py-3">
                    <p className="theme-heading font-semibold">
                      {user?.name || "Guest"}
                    </p>
                    <p className="theme-meta mt-1 text-xs uppercase tracking-[0.24em]">
                      {user?.role || "Visitor"}
                    </p>
                  </div>

                  {!user && (
                    <div className="space-y-1">
                      <DropdownLink
                        href="/sign-in"
                        label="Sign In"
                        onNavigate={() => setProfileOpen(false)}
                      />
                      <DropdownLink
                        href="/about"
                        label="About Platform"
                        onNavigate={() => setProfileOpen(false)}
                      />
                      <DropdownLink
                        href="/ai-usage"
                        label="AI Usage"
                        onNavigate={() => setProfileOpen(false)}
                      />
                    </div>
                  )}

                  {user && (
                    <div className="space-y-1">
                      {canWrite && (
                        <DropdownLink
                          href="/writer"
                          label="Writer Studio"
                          onNavigate={() => setProfileOpen(false)}
                        />
                      )}

                      {canManage && (
                        <DropdownLink
                          href="/ceo"
                          label="Command Center"
                          onNavigate={() => setProfileOpen(false)}
                        />
                      )}

                      <DropdownLink
                        href="/settings"
                        label="Settings"
                        onNavigate={() => setProfileOpen(false)}
                      />
                      <DropdownLink
                        href="/about"
                        label="About Platform"
                        onNavigate={() => setProfileOpen(false)}
                      />
                      <DropdownLink
                        href="/ai-usage"
                        label="AI Usage"
                        onNavigate={() => setProfileOpen(false)}
                      />

                      <button
                        type="button"
                        role="menuitem"
                        onClick={toggleTheme}
                        className="theme-panel-hover flex w-full items-center justify-between rounded-[18px] px-3 py-3 text-left text-sm text-[var(--text-primary)]"
                      >
                        <span>Theme toggle</span>
                        <span className="theme-meta text-[10px] uppercase tracking-[0.24em]">
                          {theme}
                        </span>
                      </button>

                      <DropdownLink
                        href="/api/auth/signout"
                        label="Sign Out"
                        onNavigate={() => setProfileOpen(false)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm text-[var(--text-primary)] hover:opacity-80 md:hidden"
              onClick={() => setMobileNavOpen(true)}
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

      {mobileNavOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          />

          <div
            ref={mobileNavRef}
            className="fixed inset-y-0 right-0 z-50 w-[320px] max-w-[88vw] border-l border-[var(--border-color)] bg-[var(--sidebar-bg)] p-5 shadow-2xl md:hidden"
          >
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Foldout Sidebar</p>
                <h2 className="font-heading theme-heading mt-3 text-3xl font-semibold">
                  Discovery
                </h2>
                <p className="theme-meta mt-2 text-sm">
                  Browse, switch themes, and move into writer onboarding.
                </p>
              </div>

              <button
                type="button"
                className="story-button-secondary"
                onClick={() => setMobileNavOpen(false)}
              >
                Close
              </button>
            </div>

            <nav className="space-y-2">
              {discoveryLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="theme-panel-hover block rounded-[20px] border border-[var(--border-color)] px-4 py-3"
                >
                  <span className="theme-heading block text-sm font-medium">
                    {item.label}
                  </span>
                  <span className="theme-meta mt-1 block text-xs">
                    {item.description}
                  </span>
                </Link>
              ))}
            </nav>

            <div className="mt-6 border-t border-[var(--border-color)] pt-5">
              <button
                type="button"
                onClick={toggleTheme}
                className="story-button-secondary w-full justify-center"
              >
                {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
              </button>
            </div>

            {!user && (
              <div className="mt-4">
                <Link
                  href="/sign-in"
                  onClick={() => setMobileNavOpen(false)}
                  className="story-button-primary w-full justify-center"
                >
                  Sign In
                </Link>
              </div>
            )}

            {user && canWrite && (
              <div className="mt-4">
                <Link
                  href="/writer"
                  onClick={() => setMobileNavOpen(false)}
                  className="story-button-secondary w-full justify-center"
                >
                  Writer Studio
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      <div className="page-shell">
        <main className="min-w-0">
          {isExploreRoute ? children : <div className="surface-panel overflow-hidden">{children}</div>}
        </main>
      </div>
    </div>
  );
}

function DropdownLink({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="theme-panel-hover block rounded-[18px] px-3 py-3 text-sm text-[var(--text-primary)]"
    >
      {label}
    </Link>
  );
}
