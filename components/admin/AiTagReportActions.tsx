"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/admin/ui";

/** Mark an AI-tag report reviewed, or dismiss it (PATCH /api/admin/ai-tag-reports/[id], Board/CEO, audited). */
export default function AiTagReportActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "MARK_REVIEWED" | "DISMISS") {
    if (busy) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/admin/ai-tag-reports/${encodeURIComponent(reportId)}`, {
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
      <button type="button" onClick={() => void act("MARK_REVIEWED")} disabled={busy} className="story-button-primary min-h-11 disabled:opacity-50">
        Mark reviewed
      </button>
      <button type="button" onClick={() => void act("DISMISS")} disabled={busy} className="story-button-secondary min-h-11 disabled:opacity-50">
        Dismiss
      </button>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}
