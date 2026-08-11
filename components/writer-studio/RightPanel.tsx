"use client";

import { Fragment, useMemo } from "react";

export default function RightPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const tabs = useMemo(
    () => [
      { id: "publish", label: "Publish" },
      { id: "media", label: "Media" },
      { id: "characters", label: "Characters" },
      { id: "outline", label: "Outline" },
    ],
    []
  );

  return (
    <aside
      aria-hidden={!open}
      className={`h-full w-full max-w-[380px] transform bg-[var(--panel-bg)] p-4 lg:static lg:translate-x-0 ${
        open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tools</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-xs"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      <div className="mt-4">
        <nav className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className="rounded-md px-3 py-1 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/5"
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-4 space-y-4 text-sm">
          <PublishPlaceholder />
          <MediaPlaceholder />
          <CharactersPlaceholder />
          <OutlinePlaceholder />
        </div>
      </div>
    </aside>
  );
}

function PlaceholderBox({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
      <p className="font-semibold text-sm">{title}</p>
      <div className="mt-2 text-xs theme-meta">{children}</div>
    </div>
  );
}

function PublishPlaceholder() {
  return (
    <PlaceholderBox title="Publish">
      <p className="mb-2">Quick publish controls and status. This reuses your existing publishing UI when wired.</p>
      <div className="flex gap-2">
        <button className="rounded-md border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1 text-xs">Draft</button>
        <button className="rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1 text-xs">Publish</button>
      </div>
    </PlaceholderBox>
  );
}

function MediaPlaceholder() {
  return (
    <PlaceholderBox title="Media">
      <p>Browse covers and image assets. Click to attach to this story.</p>
    </PlaceholderBox>
  );
}

function CharactersPlaceholder() {
  return (
    <PlaceholderBox title="Characters">
      <p>List of characters for quick reference and insertion into the manuscript.</p>
    </PlaceholderBox>
  );
}

function OutlinePlaceholder() {
  return (
    <PlaceholderBox title="Outline">
      <p>Story outline, notes, and quick navigation between beats.</p>
    </PlaceholderBox>
  );
}
