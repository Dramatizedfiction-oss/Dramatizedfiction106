"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavbarUser = {
  role: string;
} | null;

export default function Navbar({ user }: { user: NavbarUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isWriter = user && ["AUTHOR", "ADMIN", "CEO"].includes(user.role);
  const isCEO = user?.role === "CEO";

  const links = [
    { href: "/", label: "Home" },
    { href: "/explore", label: "Explore" },
    ...(isWriter ? [{ href: "/writer", label: "Writer Studio" }] : []),
    ...(isCEO ? [{ href: "/ceo", label: "CEO Studio" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/55 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-sm font-semibold text-white">
            DF
          </div>
          <div>
            <p className="eyebrow">Dramatized Fiction</p>
            <p className="font-heading text-2xl font-bold leading-none text-white">Stories Performed in Text</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {!user ? (
            <Link href="/api/auth/signin" className="story-button-primary ml-3">
              Sign In
            </Link>
          ) : (
            <Link href="/api/auth/signout" className="story-button-secondary ml-3">
              Sign Out
            </Link>
          )}
        </nav>

        <button
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white md:hidden"
          onClick={() => setOpen((value) => !value)}
        >
          Menu
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#08080d] px-4 py-4 md:hidden">
          <div className="space-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {!user ? (
              <Link href="/api/auth/signin" className="story-button-primary mt-3 w-full" onClick={() => setOpen(false)}>
                Sign In
              </Link>
            ) : (
              <Link href="/api/auth/signout" className="story-button-secondary mt-3 w-full" onClick={() => setOpen(false)}>
                Sign Out
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
