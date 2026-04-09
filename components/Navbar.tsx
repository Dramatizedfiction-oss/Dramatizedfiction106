"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navbar({ user }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="w-full bg-slate-950 border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          DRAMATIZED
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/explore" className="hover:text-blue-400">
            Explore
          </Link>

          {user && user.role === "AUTHOR" && (
            <Link href="/writer" className="hover:text-blue-400">
              Writer Studio
            </Link>
          )}

          {user && user.role === "CEO" && (
            <Link href="/ceo" className="hover:text-blue-400">
              CEO Dashboard
            </Link>
          )}

          {!user && (
            <Link href="/login" className="hover:text-blue-400">
              Login
            </Link>
          )}

          {user && (
            <Link href="/api/auth/signout" className="hover:text-red-400">
              Logout
            </Link>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-slate-300"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-slate-900 border-t border-slate-800 p-4 space-y-4">
          <Link href="/explore" className="block">
            Explore
          </Link>

          {user && user.role === "AUTHOR" && (
            <Link href="/writer" className="block">
              Writer Studio
            </Link>
          )}

          {user && user.role === "CEO" && (
            <Link href="/ceo" className="block">
              CEO Dashboard
            </Link>
          )}

          {!user && <Link href="/login">Login</Link>}

          {user && (
            <Link href="/api/auth/signout" className="text-red-400">
              Logout
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
