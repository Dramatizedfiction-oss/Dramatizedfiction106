import type { ReactNode } from "react";

/*
 * Small shared pieces for the Administration and CEO Studio screens (Sweep E
 * surface types): a Panel is a titled work area (title bar, hairline, body);
 * a Stat is a number in an inset well, so figures don't look like panels.
 * Lists of destinations use Group/Row and entry points FeatureCard
 * (components/ui/Surface).
 */

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const hasHeader = Boolean(title || action);
  return (
    <section className={`overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] ${className}`.trim()}>
      {hasHeader ? (
        <div className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6 ${children ? "border-b border-[var(--border-color)]" : ""}`}>
          <div className="min-w-0">
            {title ? <h2 className="theme-heading text-lg font-semibold">{title}</h2> : null}
            {description ? <p className="theme-meta mt-1 text-sm leading-6">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children ? <div className="p-5 sm:p-6">{children}</div> : null}
    </section>
  );
}

export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <div className="rounded-[var(--radius-group)] bg-[var(--surface-inset)] p-4 ring-1 ring-inset ring-[var(--border-color)]">
      <p className="theme-meta font-mono-df text-[10px] font-bold uppercase tracking-[0.16em]">{label}</p>
      <p className="font-heading theme-heading mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</p>
      {note ? <p className="theme-meta mt-2 text-xs leading-5">{note}</p> : null}
    </div>
  );
}

const TONES = {
  neutral: "border-[var(--border-color)] text-[var(--text-secondary)]",
  good: "border-[color-mix(in_srgb,var(--status-live)_45%,transparent)] text-[var(--status-live)]",
  warn: "border-[color-mix(in_srgb,var(--status-warning)_45%,transparent)] text-[var(--status-warning)]",
  danger: "border-[color-mix(in_srgb,var(--status-danger)_45%,transparent)] text-[var(--status-danger)]",
  accent: "border-[var(--accent)] text-[var(--accent)]",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono-df text-[10px] uppercase tracking-[0.14em] ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function Notice({ tone = "neutral", children }: { tone?: "neutral" | "error" | "success"; children: ReactNode }) {
  const color =
    tone === "error" ? "text-[var(--status-danger)]" : tone === "success" ? "text-[var(--status-live)]" : "text-[var(--text-secondary)]";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`text-sm leading-6 ${color}`}>
      {children}
    </p>
  );
}

export const ROLE_LABELS: Record<string, string> = { READER: "Reader", WRITER: "Writer", BOARD: "Board", CEO: "CEO" };
