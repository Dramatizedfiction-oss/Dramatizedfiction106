import type { ReactNode } from "react";

export default function StudioEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--studio-border)] px-6 py-10 text-center">
      <p className="theme-heading font-heading text-xl font-semibold">{title}</p>
      <p className="theme-meta mx-auto mt-2 max-w-md text-sm leading-6">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
