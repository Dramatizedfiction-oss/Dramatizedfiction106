"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/admin/ui";

/*
 * Remove the reported comment, or dismiss the report. The server
 * (PATCH /api/admin/reports/[id], Board/CEO) authorizes and audits both.
 */
export default function ReportActions({ reportId, commentRemoved }: { reportId: string; commentRemoved: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "REMOVE_COMMENT" | "DISMISS") {
    if (busy) return;
    if (action === "REMOVE_COMMENT" && !window.confirm("Remove this comment? Readers won't see it any more.")) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/admin/reports/${encodeURIComponent(reportId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!response?.ok) {
      setError(payload?.error || "Couldn't update the report. Please try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {commentRemoved ? null : (
        <button
          type="button"
          onClick={() => void act("REMOVE_COMMENT")}
          disabled={busy}
          className="inline-flex min-h-11 items-center rounded-full border border-[color-mix(in_srgb,var(--status-danger)_45%,transparent)] px-4 text-sm font-semibold text-[var(--status-danger)] transition hover:bg-[color-mix(in_srgb,var(--status-danger)_8%,transparent)] disabled:opacity-50"
        >
          Remove comment
        </button>
      )}
      <button type="button" onClick={() => void act("DISMISS")} disabled={busy} className="story-button-secondary min-h-11 disabled:opacity-50">
        {commentRemoved ? "Close report" : "Dismiss"}
      </button>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}
