import Link from "next/link";
import type { ReactNode } from "react";

/*
 * The site's surface types (Sweep E). Each has one job, so long or list-heavy
 * screens don't turn into a stack of identical boxes. The look lives in the
 * .surface-* classes in app/globals.css (both themes); these are thin,
 * server-safe wrappers. Never put a card inside a card.
 *
 *   Callout       the "in short" summary (tint + violet rule)
 *   Note          a note or warning (tone: note | success | warning | danger)
 *   Group + Row   a grouped list of rows (settings-style), optional title above
 *   Facts         a strip of small facts in an inset well
 *   FeatureCard   an entry point, with the brand gradient edge
 */

export function Callout({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`surface-callout ${className}`.trim()}>{children}</div>;
}

type Tone = "note" | "success" | "warning" | "danger";

export function Note({ tone = "note", children, className = "", role }: { tone?: Tone; children: ReactNode; className?: string; role?: "status" | "alert" }) {
  return (
    <div className={`surface-note ${className}`.trim()} data-tone={tone} role={role}>
      <span className="surface-note-icon" aria-hidden>
        <NoteIcon tone={tone} />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function NoteIcon({ tone }: { tone: Tone }) {
  const common = { viewBox: "0 0 20 20", className: "h-[18px] w-[18px]", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (tone === "warning" || tone === "danger") {
    return (
      <svg {...common}>
        <path d="M10 3.2 2.6 16.2h14.8L10 3.2Z" />
        <path d="M10 8v4M10 14.4v.1" />
      </svg>
    );
  }
  if (tone === "success") {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="7.5" />
        <path d="m6.8 10.2 2.2 2.2 4.2-4.6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 9v5M10 6.2v.1" />
    </svg>
  );
}

/** A grouped list. `title` sits above the container, like a phone settings screen. */
export function Group({ title, titleId, children, className = "" }: { title?: string; titleId?: string; children: ReactNode; className?: string }) {
  return (
    <section className={className} aria-labelledby={title && titleId ? titleId : undefined}>
      {title ? (
        <h2 id={titleId} className="surface-group-title">
          {title}
        </h2>
      ) : null}
      <ul className="surface-group">{children}</ul>
    </section>
  );
}

/**
 * One row of a Group: a link (href), a button (onClick) or plain content.
 * Icon on the left, title and description, trailing content (chevron by default for links).
 */
export function Row({
  href,
  icon,
  title,
  description,
  trailing,
  children,
}: {
  href?: string;
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  const body = (
    <>
      {icon ? (
        <span className="surface-row-icon" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        {title ? <span className="block text-[0.9375rem] font-semibold text-[var(--text-primary)]">{title}</span> : null}
        {description ? <span className="theme-meta mt-0.5 block text-sm leading-5">{description}</span> : null}
        {children}
      </span>
      {trailing ?? (href ? <RowChevron /> : null)}
    </>
  );
  return <li>{href ? <Link href={href} className="surface-row group">{body}</Link> : <div className="surface-row">{body}</div>}</li>;
}

export function RowChevron() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-[var(--text-muted)] transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 4.5L13 10l-5.5 5.5" />
    </svg>
  );
}

/** A strip of small facts. Each item is already-worded content (e.g. "Effective 1 May 2026"). */
export function Facts({ items, className = "" }: { items: ReactNode[]; className?: string }) {
  const shown = items.filter(Boolean);
  if (shown.length === 0) return null;
  return (
    <ul className={`surface-facts ${className}`.trim()}>
      {shown.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function FeatureCard({ href, children, className = "" }: { href?: string; children: ReactNode; className?: string }) {
  const classes = `surface-feature block p-5 sm:p-6 ${href ? "transition hover:border-[var(--border-strong)]" : ""} ${className}`.trim();
  return href ? (
    <Link href={href} className={classes}>
      {children}
    </Link>
  ) : (
    <div className={classes}>{children}</div>
  );
}
