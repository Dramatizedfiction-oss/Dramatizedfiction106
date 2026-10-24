import Link from "next/link";
import type { ReactNode } from "react";
import { Note } from "@/components/ui/Surface";

/*
 * Shared Settings building blocks (server-safe), on the Sweep E surface types:
 *   SettingsPageHeader  a sub-page header with the back link
 *   SettingsGroup       one grouped container (optional title above it) whose
 *                       rows are SettingsSections, separated by hairlines
 *   SettingsSection     one setting inside a group; tone="danger" stands on
 *                       its own as a danger note (the account's last block)
 * The landing page and About & Help use Group/Row from components/ui/Surface.
 */

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

export function SettingsGroup({ title, description, children, className = "mt-6" }: { title?: string; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {title ? <h2 className="surface-group-title">{title}</h2> : null}
      {description ? <p className="theme-meta -mt-1 mb-2 ml-1 text-xs leading-5">{description}</p> : null}
      <div className="surface-group">{children}</div>
    </div>
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
  if (tone === "danger") {
    return (
      <Note tone="danger" className="mt-8">
        <h2 className="text-base font-semibold text-[var(--status-danger)]">{title}</h2>
        {description ? <div className="theme-meta mt-1 text-sm leading-6">{description}</div> : null}
        <div className="mt-3">{children}</div>
      </Note>
    );
  }
  return (
    <section className="p-4 sm:p-5">
      <h2 className="theme-heading text-base font-semibold">{title}</h2>
      {description ? <div className="theme-meta mt-1 text-sm leading-6">{description}</div> : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}
