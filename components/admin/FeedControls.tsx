"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/admin/ui";

/* Small client pieces for Administration > Feed (Sweep C). */

async function send(url: string, init: RequestInit) {
  const response = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init }).catch(() => null);
  const payload = (await response?.json().catch(() => null)) as { error?: string } | null;
  return { ok: Boolean(response?.ok), error: payload?.error };
}

export function RefreshFeedButton() {
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; message: { tone: "error" | "success"; text: string } | null }>({ busy: false, message: null });
  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={state.busy}
        onClick={async () => {
          setState({ busy: true, message: null });
          const result = await send("/api/admin/feed/refresh", { method: "POST" });
          setState({
            busy: false,
            message: result.ok ? { tone: "success", text: "Stats refreshed; the feed rebuilds on the next visit." } : { tone: "error", text: result.error || "Refresh failed." },
          });
          router.refresh();
        }}
        className="story-button-secondary min-h-11 disabled:opacity-50"
      >
        {state.busy ? "Refreshing..." : "Refresh stats now"}
      </button>
      {state.message ? <Notice tone={state.message.tone}>{state.message.text}</Notice> : null}
    </div>
  );
}

export function SeriesLookup() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; title: string; authorName: string | null; moderationStatus: string }[] | null>(null);
  return (
    <div className="space-y-3">
      <form
        className="flex gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const response = await fetch(`/api/admin/feed/search?q=${encodeURIComponent(query)}`, { credentials: "include" }).catch(() => null);
          const data = (await response?.json().catch(() => null)) as { series?: typeof results } | null;
          setResults(data?.series ?? []);
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Series title or writer"
          aria-label="Find a series by title or writer"
          className="ui-input min-w-0 flex-1 px-3 py-2 text-base sm:text-sm"
        />
        <button type="submit" className="story-button-secondary min-h-11">
          Find
        </button>
      </form>
      {results ? (
        results.length ? (
          <ul className="divide-y divide-[var(--border-color)]">
            {results.map((series) => (
              <li key={series.id}>
                <Link href={`/administration/feed/series/${series.id}`} className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm hover:text-[var(--accent)]">
                  <span className="min-w-0 truncate text-[var(--text-primary)]">
                    {series.title} <span className="theme-meta">· {series.authorName ?? "Unknown"}</span>
                  </span>
                  {series.moderationStatus !== "VISIBLE" ? <span className="theme-meta shrink-0 text-xs">{series.moderationStatus.replace("_", " ").toLowerCase()}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="theme-meta text-sm">No published series match.</p>
        )
      ) : null}
    </div>
  );
}

const STATUS_LABELS: Record<string, string> = { VISIBLE: "Visible", IN_REVIEW: "In review", HELD: "Held", BLOCKED: "Blocked" };

export function SeriesModerationControl({ seriesId, current }: { seriesId: string; current: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  async function change(status: string) {
    if (status !== "VISIBLE" && !window.confirm(`Mark this series ${STATUS_LABELS[status].toLowerCase()}? It leaves the feed, Explore and recommendation rows right away.`)) return;
    setBusy(true);
    setMessage(null);
    const result = await send(`/api/admin/feed/series/${encodeURIComponent(seriesId)}`, {
      method: "PATCH",
      body: JSON.stringify({ moderationStatus: status, note }),
    });
    setBusy(false);
    setMessage(result.ok ? { tone: "success", text: `Now ${STATUS_LABELS[status].toLowerCase()}.` } : { tone: "error", text: result.error || "That didn't work." });
    if (result.ok) {
      setNote("");
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="theme-heading mb-1 block text-sm font-semibold">Note for the audit log (optional)</span>
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} className="ui-input w-full px-3 py-2 text-base sm:text-sm" />
      </label>
      <div className="flex flex-wrap gap-2">
        {Object.keys(STATUS_LABELS)
          .filter((status) => status !== current)
          .map((status) => (
            <button
              key={status}
              type="button"
              disabled={busy}
              onClick={() => void change(status)}
              className={`${status === "VISIBLE" ? "story-button-primary" : "story-button-secondary"} min-h-11 disabled:opacity-50`}
            >
              {status === "VISIBLE" ? "Release (visible)" : `Mark ${STATUS_LABELS[status].toLowerCase()}`}
            </button>
          ))}
      </div>
      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
    </div>
  );
}
