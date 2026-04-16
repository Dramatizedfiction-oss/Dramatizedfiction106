"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarUser = {
  role: string;
} | null;

export default function Sidebar({ user }: { user: SidebarUser }) {
  const path = usePathname();

  if (!user) return null;

  const isWriter = user.role === "AUTHOR" || user.role === "ADMIN" || user.role === "CEO";
  const isCEO = user.role === "CEO";

  return (
    <aside className="hidden md:block w-64 bg-slate-950 border-r border-slate-800 p-6 space-y-6">
      {isWriter && (
        <div>
          <h2 className="text-slate-400 text-sm uppercase mb-2">Writer Studio</h2>
          <nav className="space-y-2">
            <Link
              href="/writer"
              className={link(path, "/writer")}
            >
              Dashboard
            </Link>
            <Link
              href="/writer/series"
              className={link(path, "/writer/series")}
            >
              Your Series
            </Link>
            <Link
              href="/writer/episodes"
              className={link(path, "/writer/episodes")}
            >
              Your Episodes
            </Link>
            <Link
              href="/writer/stats"
              className={link(path, "/writer/stats")}
            >
              Stats
            </Link>
          </nav>
        </div>
      )}

      {isCEO && (
        <div>
          <h2 className="text-slate-400 text-sm uppercase mb-2">CEO</h2>
          <nav className="space-y-2">
            <Link href="/ceo" className={link(path, "/ceo")}>
              Dashboard
            </Link>
            <Link href="/ceo/settings" className={link(path, "/ceo/settings")}>
              Settings
            </Link>
            <Link href="/ceo/users" className={link(path, "/ceo/users")}>
              Users
            </Link>
            <Link href="/ceo/analytics" className={link(path, "/ceo/analytics")}>
              Analytics
            </Link>
          </nav>
        </div>
      )}
    </aside>
  );
}

function link(path: string, href: string) {
  return `block px-3 py-2 rounded ${
    path.startsWith(href)
      ? "bg-blue-600 text-white"
      : "text-slate-300 hover:bg-slate-800"
  }`;
}
