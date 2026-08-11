import React from "react";

export default function StoryHeader({
  title,
  cover,
  status,
}: {
  title?: string;
  cover?: string | null;
  status?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)]">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={title || "Cover"} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-[var(--text-primary)]">SB</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="block truncate text-sm font-semibold theme-heading">{title || "Untitled story"}</p>
          <p className="theme-meta mt-0.5 text-xs">{status || "Draft"}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm">Save</button>
        <button className="rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm">Publish</button>
      </div>
    </div>
  );
}
