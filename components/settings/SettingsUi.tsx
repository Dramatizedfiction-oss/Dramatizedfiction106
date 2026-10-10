import Link from "next/link";
import type { ReactNode } from "react";

/*
 * Shared Settings building blocks (server-safe): the landing page's arrow
 * cards, a sub-page header with a back link, and a titled row group.
 */

export function SettingsCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="theme-panel group flex min-h-[72px] items-center gap-4 rounded-[22px] border px-4 py-3 transition hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))] sm:px-5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[hsl(var(--series-accent))]">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="theme-heading block text-base font-semibold">{title}</span>
          <span className="theme-meta mt-0.5 block text-sm leading-5">{description}</span>
        </span>
        <ChevronIcon />
      </Link>
    </li>
  );
}

export function SettingsPageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header>
      <Link
        href="/settings"
        className="theme-meta -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm transition hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))]"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.5 4.5L7 10l5.5 5.5" />
        </svg>
        Settings
      </Link>
      <h1 className="font-heading theme-heading mt-2 text-3xl font-semibold md:text-4xl">{title}</h1>
      {description ? <p className="theme-meta mt-2 text-sm leading-6">{description}</p> : null}
    </header>
  );
}

export function SettingsSection({
  title,
  description,
  children,
  tone = "default",
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <section
      className={`mt-6 rounded-[24px] border p-5 sm:p-6 ${
        tone === "danger"
          ? "border-[color-mix(in_srgb,var(--status-danger)_45%,transparent)] bg-[color-mix(in_srgb,var(--status-danger)_6%,var(--bg-secondary))]"
          : "theme-panel"
      }`}
    >
      <h2 className={`text-lg font-semibold ${tone === "danger" ? "text-[var(--status-danger)]" : "theme-heading"}`}>{title}</h2>
      {description ? <div className="theme-meta mt-1 text-sm leading-6">{description}</div> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-[var(--text-muted)] transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 4.5L13 10l-5.5 5.5" />
    </svg>
  );
}
