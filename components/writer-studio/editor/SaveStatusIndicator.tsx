"use client";

import { AlertIcon, CheckIcon } from "@/components/icons";
import type { SaveStatus } from "./autosave-state";
import type { AutosaveMode } from "./use-episode-autosave";

function timeLabel(at: number | null) {
  return at ? new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;
}

/** One place that says whether the writer's words are safe. Announced politely to screen readers. */
export default function SaveStatusIndicator({
  status,
  mode,
  onRetry,
  compact = false,
}: {
  status: SaveStatus;
  mode: AutosaveMode;
  onRetry: () => void;
  compact?: boolean;
}) {
  let tone: "ok" | "muted" | "warning" | "danger" = "muted";
  let text: string;
  let action: React.ReactNode = null;

  switch (status.kind) {
    case "saved": {
      tone = "ok";
      const time = timeLabel(status.at);
      text = mode === "live" ? "Live · up to date" : time ? `Saved · ${time}` : "Saved";
      break;
    }
    case "dirty":
      text = mode === "live" ? "Changes not live yet" : "Editing…";
      if (mode === "live") tone = "warning";
      break;
    case "saving":
      text = mode === "live" ? "Updating…" : "Saving…";
      break;
    case "offline":
      tone = "warning";
      text = compact ? "Offline" : "Offline · kept on this device";
      break;
    case "retrying":
      tone = "warning";
      text = compact ? "Retrying…" : "Couldn't save · retrying";
      action = <RetryButton onRetry={onRetry} />;
      break;
    case "blocked":
      tone = "danger";
      text = status.message;
      if (status.reason === "unauthenticated") {
        action = (
          <>
            <a href="/sign-in" target="_blank" rel="noopener" className="underline underline-offset-2">
              Sign in
            </a>
            <RetryButton onRetry={onRetry} />
          </>
        );
      } else if (status.reason === "rejected") {
        action = <RetryButton onRetry={onRetry} />;
      }
      break;
  }

  const color =
    tone === "ok"
      ? "text-[var(--studio-muted)]"
      : tone === "warning"
        ? "text-[var(--status-warning)]"
        : tone === "danger"
          ? "text-[var(--status-danger)]"
          : "text-[var(--studio-muted)]";

  return (
    <div role="status" aria-live="polite" className={`flex min-w-0 items-center gap-2 text-xs ${color}`}>
      {tone === "ok" ? <CheckIcon size={14} className="shrink-0" /> : null}
      {tone === "warning" || tone === "danger" ? <AlertIcon size={14} className="shrink-0" /> : null}
      <span className="truncate">{text}</span>
      {action ? <span className="flex shrink-0 items-center gap-2">{action}</span> : null}
    </div>
  );
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
      Retry now
    </button>
  );
}
