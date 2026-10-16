"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import MarkdownField from "@/components/admin/content/MarkdownField";
import { Notice } from "@/components/admin/ui";
import ContentPreview from "@/components/content/ContentPreview";
import type { ContentDef, ContentValues, FieldDef } from "@/lib/content/registry";
import type { ContentState, RevisionEntry } from "@/lib/content/service";

/*
 * Edits one Administration › Content item (Sweep B3): a field per value, Edit
 * / Preview / History tabs, Save, "last edited by" and Restore. Unsaved
 * changes are guarded when leaving (closing the tab or following a link).
 * Every request goes to /api/admin/content/[key] (Board and CEO on the
 * server); the server validates everything again.
 */
type Tab = "edit" | "preview" | "history";

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function ContentEditor({ def, initial }: { def: ContentDef; initial: ContentState }) {
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState<ContentValues>(initial.values);
  const [tab, setTab] = useState<Tab>("edit");
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string; field?: string }>({ kind: "idle" });
  const [revisions, setRevisions] = useState<RevisionEntry[] | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved.values);
  const baseId = useId();

  // Leaving with unsaved changes: closing/reloading the tab, or following a link.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || event.defaultPrevented) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin === window.location.origin && url.pathname === window.location.pathname) return;
      if (!window.confirm("You have unsaved changes. Leave without saving?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const loadHistory = useCallback(async () => {
    setHistoryError(null);
    const response = await fetch(`/api/admin/content/${encodeURIComponent(def.key)}/revisions`).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { revisions?: RevisionEntry[] } | null;
    if (!response?.ok || !data?.revisions) {
      setHistoryError("Couldn't load the history. Please try again.");
      return;
    }
    setRevisions(data.revisions);
  }, [def.key]);

  useEffect(() => {
    if (tab === "history" && revisions === null) void loadHistory();
  }, [tab, revisions, loadHistory]);

  function set(name: string, value: string | boolean) {
    setValues((current) => ({ ...current, [name]: value }));
    if (status.kind !== "saving") setStatus({ kind: "idle" });
  }

  function accept(next: ContentState, message: string) {
    setSaved(next);
    setValues(next.values);
    setRevisions(null);
    setViewing(null);
    setStatus({ kind: "saved", message });
  }

  async function save() {
    setStatus({ kind: "saving" });
    const response = await fetch(`/api/admin/content/${encodeURIComponent(def.key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseVersion: saved.version, values }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as (ContentState & { error?: string; field?: string }) | null;
    if (!response?.ok || !data || data.error) {
      setStatus({ kind: "error", message: data?.error || "Couldn't save. Check your connection and try again.", field: data?.field });
      if (data?.field) setTab("edit");
      return;
    }
    accept(data, "Saved. The live site shows this version now.");
  }

  async function restore(version: number) {
    const label = version === 0 ? "the built-in text" : `version ${version}`;
    const warning = dirty ? " Your unsaved changes will be lost." : "";
    if (!window.confirm(`Restore ${label}? It's saved as a new version, so nothing is lost.${warning}`)) return;
    setStatus({ kind: "saving" });
    const response = await fetch(`/api/admin/content/${encodeURIComponent(def.key)}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version, baseVersion: saved.version }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as (ContentState & { error?: string }) | null;
    if (!response?.ok || !data || data.error) {
      setStatus({ kind: "error", message: data?.error || "Couldn't restore. Please try again." });
      return;
    }
    accept(data, `Restored ${label} as version ${data.version}.`);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "edit", label: "Edit" },
    { id: "preview", label: "Preview" },
    { id: "history", label: "History" },
  ];

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading theme-heading text-2xl font-semibold">{def.label}</h2>
          <p className="theme-meta mt-1 text-sm leading-6">{def.description}</p>
          <p className="theme-meta mt-2 text-xs leading-5" suppressHydrationWarning>
            {saved.updatedAt
              ? `Last edited by ${saved.updatedBy ?? "a former member"} · ${when(saved.updatedAt)} · version ${saved.version}`
              : "Built-in text. Not edited yet."}
          </p>
          <p className="theme-meta mt-1 text-xs">
            Shown on{" "}
            {def.usedOn.map((place, index) => (
              <span key={place.href + place.label}>
                {index ? ", " : ""}
                <Link href={place.href} target="_blank" className="font-semibold text-[var(--text-primary)] underline underline-offset-4">
                  {place.label}
                </Link>
              </span>
            ))}
          </p>
        </div>
      </header>

      {saved.storedInvalid ? (
        <div className="mt-4 rounded-2xl border border-[var(--status-danger)] p-3">
          <Notice tone="error">The saved version couldn&apos;t be read, so the site shows the built-in text. Save to replace it.</Notice>
        </div>
      ) : null}

      <div role="tablist" aria-label="Editor views" className="mt-5 grid grid-cols-3 gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] p-1 sm:inline-grid sm:min-w-[360px]">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`${baseId}-panel`}
            onClick={() => setTab(item.id)}
            className={`min-h-11 rounded-full px-3 text-sm font-semibold transition ${
              tab === item.id
                ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[var(--shadow-card)] ring-1 ring-[var(--border-strong)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${tab}`} className="mt-5">
        {tab === "edit" ? (
          <div className="space-y-6">
            {def.fields.map((field) => (
              <FieldInput
                key={field.name}
                field={field}
                value={values[field.name]}
                error={status.kind === "error" && status.field === field.name ? status.message : undefined}
                onChange={(value) => set(field.name, value)}
              />
            ))}
            <MarkdownHelp def={def} />
          </div>
        ) : tab === "preview" ? (
          <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--bg-primary)] p-4 sm:p-6">
            <p className="eyebrow mb-4">Preview{dirty ? " · unsaved changes" : ""}</p>
            <ContentPreview def={def} values={values} />
          </div>
        ) : (
          <History
            def={def}
            revisions={revisions}
            error={historyError}
            currentVersion={saved.version}
            viewing={viewing}
            onView={(version) => setViewing(viewing === version ? null : version)}
            onRestore={(version) => void restore(version)}
            busy={status.kind === "saving"}
          />
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-8 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 md:mx-0 md:rounded-2xl md:border">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || status.kind === "saving"}
            className="story-button-primary min-h-11 disabled:opacity-50"
          >
            {status.kind === "saving" ? "Saving…" : "Save"}
          </button>
          {dirty ? (
            <button type="button" onClick={() => { setValues(saved.values); setStatus({ kind: "idle" }); }} className="story-button-secondary min-h-11">
              Discard changes
            </button>
          ) : null}
          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
            {status.kind === "error" && !status.field ? <Notice tone="error">{status.message}</Notice> : null}
            {status.kind === "error" && status.field ? <Notice tone="error">Check the highlighted field.</Notice> : null}
            {status.kind === "saved" ? <Notice tone="success">{status.message}</Notice> : null}
            {status.kind === "idle" && dirty ? <Notice>Unsaved changes.</Notice> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldDef;
  value: string | boolean | undefined;
  error?: string;
  onChange: (value: string | boolean) => void;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const text = typeof value === "string" ? value : "";

  if (field.kind === "boolean") {
    const on = value === true;
    return (
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] p-4">
        <span id={`${id}-label`} className="theme-heading text-sm font-semibold">
          {field.label}: {on ? "On" : "Off"}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={`${id}-label`}
          onClick={() => onChange(!on)}
          className="relative flex h-11 w-[60px] shrink-0 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--series-accent))]"
        >
          <span aria-hidden="true" className={`absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 rounded-full transition ${on ? "bg-[hsl(var(--series-accent))]" : "bg-[var(--border-strong)]"}`} />
          <span aria-hidden="true" className={`relative h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[32px]" : "translate-x-[4px]"}`} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="theme-heading text-sm font-semibold">
          {field.label}
          {field.required ? null : <span className="theme-meta font-normal"> (optional)</span>}
        </label>
        <span className="theme-meta shrink-0 text-xs tabular-nums">
          {text.length.toLocaleString()}/{field.max.toLocaleString()}
        </span>
      </div>
      {field.kind === "markdown" ? (
        <MarkdownField id={id} value={text} onChange={onChange} max={field.max} rows={field.max > 20_000 ? 18 : 8} invalid={Boolean(error)} describedBy={hintId} />
      ) : (
        <input
          id={id}
          type={field.kind === "link" ? "url" : "text"}
          inputMode={field.kind === "link" ? "url" : undefined}
          value={text}
          onChange={(event) => onChange(event.target.value)}
          maxLength={field.max}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={hintId}
          className="ui-input w-full px-4 py-3 text-base sm:text-sm"
        />
      )}
      <p id={hintId} className={`mt-1.5 text-xs leading-5 ${error ? "text-[var(--status-danger)]" : "theme-meta"}`}>
        {error ?? field.hint ?? ""}
      </p>
    </div>
  );
}

function MarkdownHelp({ def }: { def: ContentDef }) {
  if (!def.fields.some((field) => field.kind === "markdown")) return null;
  return (
    <details className="rounded-2xl border border-[var(--border-color)] p-4 text-sm">
      <summary className="theme-heading min-h-11 cursor-pointer font-semibold">Formatting help</summary>
      <ul className="theme-meta mt-2 space-y-1.5 leading-6">
        <li>A blank line starts a new paragraph.</li>
        <li>
          <code>**bold**</code>, <code>*italic*</code>, <code>[text](https://example.com)</code> or <code>[text](/explore)</code>
        </li>
        <li>
          <code>## Heading</code> starts a section{def.preview === "document" ? " (a card or collapsible section on this page)" : ""}.
        </li>
        <li>
          <code>- item</code> for bullets, <code>1. item</code> for numbers, <code>&gt; quote</code> for a quote.
        </li>
        <li>Tables: a header row, a <code>|---|---|</code> row, then rows. Use <code>\|</code> for a | inside a cell.</li>
        <li>HTML isn&apos;t allowed; it shows as plain text.</li>
      </ul>
    </details>
  );
}

function History({
  def,
  revisions,
  error,
  currentVersion,
  viewing,
  onView,
  onRestore,
  busy,
}: {
  def: ContentDef;
  revisions: RevisionEntry[] | null;
  error: string | null;
  currentVersion: number;
  viewing: number | null;
  onView: (version: number) => void;
  onRestore: (version: number) => void;
  busy: boolean;
}) {
  if (error) return <Notice tone="error">{error}</Notice>;
  if (!revisions) return <p className="theme-meta text-sm">Loading history…</p>;

  const entries: { version: number; title: string; meta: string; values: ContentValues | null }[] = [
    ...revisions.map((revision) => ({
      version: revision.version,
      title: `Version ${revision.version}${revision.version === currentVersion ? " · current" : ""}`,
      meta: `${revision.action === "RESTORE" ? "Restored" : revision.action === "SEED" ? "Copied from the old text" : "Saved"} by ${revision.createdBy ?? "the system"} · ${when(revision.createdAt)}`,
      values: revision.values,
    })),
    { version: 0, title: `Built-in text${currentVersion === 0 ? " · current" : ""}`, meta: "The text the site falls back to.", values: def.defaults },
  ];

  return (
    <ol className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.version} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="theme-heading text-sm font-semibold">{entry.title}</p>
              <p className="theme-meta mt-0.5 text-xs" suppressHydrationWarning>
                {entry.meta}
              </p>
            </div>
            <button type="button" onClick={() => onView(entry.version)} disabled={!entry.values} className="story-button-secondary min-h-11 disabled:opacity-50">
              {viewing === entry.version ? "Hide" : "View"}
            </button>
            {entry.version !== currentVersion ? (
              <button type="button" onClick={() => onRestore(entry.version)} disabled={busy || !entry.values} className="story-button-secondary min-h-11 disabled:opacity-50">
                Restore
              </button>
            ) : null}
          </div>
          {!entry.values ? <p className="theme-meta mt-2 text-xs">This version no longer fits the item&apos;s fields, so it can&apos;t be shown or restored.</p> : null}
          {viewing === entry.version && entry.values ? (
            <div className="mt-3 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-primary)] p-4">
              <ContentPreview def={def} values={entry.values} />
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
