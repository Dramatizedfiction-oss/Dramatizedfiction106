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
    <div className="flex items-center justify-center py-4 sm:min-h-[calc(100vh-10rem)] sm:py-10">
      <div className="w-full max-w-md rounded-[28px] border border-[var(--border-color)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-raised)] sm:p-6">
        <p className="theme-meta text-xs font-semibold uppercase tracking-[0.28em]">
          {eyebrow}
        </p>
        <h1 className="theme-heading mt-3 text-3xl font-semibold">{title}</h1>
        <p className="theme-body mt-3 text-sm leading-6">{description}</p>

        <div className="mt-6">{children}</div>

        {links.length > 0 && (
          <div className="mt-6 space-y-3 border-t border-[var(--border-color)] pt-5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="theme-body block text-sm font-medium transition hover:opacity-80"
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
