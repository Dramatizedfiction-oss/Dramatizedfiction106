"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Notice } from "@/components/admin/ui";

/** CEO-only switch with an explicit confirmation step. The server checks the role again. */
export default function RenovationControl({ enabled, canChange }: { enabled: boolean; canChange: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/admin/renovation", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !enabled, confirm: true }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!response?.ok) {
      setError(payload?.error || "That didn't work. Nothing was changed.");
      return;
    }
    setConfirming(false);
    setUnderstood(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-sm">
        <span className="theme-meta">Status:</span>
        {enabled ? <Badge tone="warn">On: site closed to the public</Badge> : <Badge tone="good">Off: site open</Badge>}
      </p>

      {!canChange ? (
        <p className="theme-meta text-sm">Only the CEO can turn Renovation Mode on or off.</p>
      ) : !confirming ? (
        <button type="button" onClick={() => setConfirming(true)} className={enabled ? "story-button-primary" : "story-button-secondary"}>
          {enabled ? "Reopen the site" : "Turn on Renovation Mode"}
        </button>
      ) : (
        <div className="rounded-2xl border border-[var(--border-strong)] p-4">
          <p className="theme-heading text-sm font-semibold">
            {enabled ? "Reopen Dramatized Fiction to everyone?" : "Close Dramatized Fiction for renovation?"}
          </p>
          {enabled ? null : (
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} className="mt-1" />
              <span className="theme-body">I understand readers and writers will be locked out until I turn it off.</span>
            </label>
          )}
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void apply()}
              disabled={busy || (!enabled && !understood)}
              className="story-button-primary disabled:opacity-50"
            >
              {busy ? "Saving…" : enabled ? "Confirm: reopen" : "Confirm: close the site"}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className="story-button-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}
