"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarUser = {
  role: string;
} | null;

export default function Sidebar({ user }: { user: SidebarUser }) {
  const path = usePathname();

  if (!user) return null;

  const isWriter = ["AUTHOR", "ADMIN", "CEO"].includes(user.role);
  const isCEO = user.role === "CEO";

  return (
    <aside className="hidden lg:block lg:w-[285px]">
      <div
        className="sticky top-28 rounded-[28px] border border-white/10 p-6"
        style={{ background: "var(--sidebar-bg)", boxShadow: "0 20px 60px rgba(0,0,0,0.28)" }}
      >
        <div className="mb-6">
          <p className="eyebrow">Command Deck</p>
          <h2 className="font-heading mt-3 text-3xl font-semibold text-white">
            {isCEO ? "Executive Studio" : "Writer Studio"}
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            A premium workspace for shaping stories, tracking performance, and managing the platform.
          </p>
        </div>

        {isWriter && (
          <div>
            <h3 className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">Writer</h3>
            <nav className="space-y-2">
              <Link href="/writer" className={link(path, "/writer")}>Dashboard</Link>
              <Link href="/writer/series" className={link(path, "/writer/series")}>Your Series</Link>
              <Link href="/writer/episodes" className={link(path, "/writer/episodes")}>Your Episodes</Link>
              <Link href="/writer/stats" className={link(path, "/writer/stats")}>Stats</Link>
            </nav>
          </div>
        )}

        {isCEO && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <h3 className="mb-3 text-xs uppercase tracking-[0.28em] text-white/35">CEO</h3>
            <nav className="space-y-2">
              <Link href="/ceo" className={link(path, "/ceo")}>Dashboard</Link>
              <Link href="/ceo/settings" className={link(path, "/ceo/settings")}>Settings</Link>
              <Link href="/ceo/users" className={link(path, "/ceo/users")}>Users</Link>
              <Link href="/ceo/analytics" className={link(path, "/ceo/analytics")}>Analytics</Link>
            </nav>
          </div>
        )}
      </div>
    </aside>
  );
}

function link(path: string, href: string) {
  const active = path === href || path.startsWith(`${href}/`);

  return `block rounded-2xl px-4 py-3 text-sm font-medium transition ${
    active
      ? "border border-white/15 bg-white/[0.08] text-white"
      : "border border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
  }`;
}
