import Link from "next/link";
import type { ReactNode } from "react";

type AuthLink = {
  href: string;
  label: string;
};

export default function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  links = [],
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  links?: AuthLink[];
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-md">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>

        <div className="mt-6">{children}</div>

        {links.length > 0 && (
          <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-sm font-medium text-sky-700 transition hover:text-sky-600"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
