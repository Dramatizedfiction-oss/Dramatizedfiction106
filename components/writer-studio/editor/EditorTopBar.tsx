"use client";

import { ArrowLeftIcon, EyeIcon } from "@/components/icons";
import EpisodeStatusBadge from "@/components/writer-studio/episodes/EpisodeStatusBadge";
import type { SaveStatus } from "./autosave-state";
import SaveStatusIndicator from "./SaveStatusIndicator";
import StepIndicator, { type EditorStep } from "./StepIndicator";
import type { AutosaveMode } from "./use-episode-autosave";

export default function EditorTopBar({
  seriesTitle,
  episodeNumber,
  status,
  saveStatus,
  mode,
  step,
  hasUnsavedChanges,
  readerView,
  busy,
  onBack,
  onRetry,
  onStepChange,
  onToggleReaderView,
  onPreview,
  onUpdateLive,
  onViewLive,
}: {
  seriesTitle: string;
  episodeNumber: number;
  status: string;
  saveStatus: SaveStatus;
  mode: AutosaveMode;
  step: EditorStep;
  hasUnsavedChanges: boolean;
  readerView: boolean;
  busy: boolean;
  onBack: () => void;
  onRetry: () => void;
  onStepChange: (step: EditorStep) => void;
  onToggleReaderView: () => void;
  onPreview: () => void;
  onUpdateLive: () => void;
  onViewLive: () => void;
}) {
  const live = mode === "live";

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--studio-border)] bg-[var(--header-bg)] backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 px-2 md:gap-3 md:px-4">
        <button type="button" onClick={onBack} className="studio-tool shrink-0" aria-label={`Back to ${seriesTitle}`} title="Back to series">
          <ArrowLeftIcon size={18} />
        </button>

        <div className="hidden min-w-0 items-center gap-2 md:flex">
          <button type="button" onClick={onBack} className="truncate text-sm text-[var(--studio-muted)] hover:text-[var(--studio-text)]">
            {seriesTitle}
          </button>
          <span className="text-[var(--studio-muted)]">›</span>
          <span className="shrink-0 text-sm text-[var(--studio-text)]">Episode {episodeNumber}</span>
          <EpisodeStatusBadge status={status} />
        </div>

        <div className="min-w-0 flex-1 md:ml-4">
          <SaveStatusIndicator status={saveStatus} mode={mode} onRetry={onRetry} compact />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {step === "write" ? (
            <button
              type="button"
              onClick={onToggleReaderView}
              aria-pressed={readerView}
              className="studio-tool hidden sm:inline-flex"
              title="Read without the editing tools"
            >
              Reader view
            </button>
          ) : null}
          <button type="button" onClick={onPreview} className="studio-tool" aria-label="Preview as a reader" title="Preview as a reader">
            <EyeIcon size={18} />
          </button>

          {live ? (
            <>
              <button type="button" onClick={onViewLive} className="studio-tool hidden sm:inline-flex">
                View live
              </button>
              <button
                type="button"
                onClick={onUpdateLive}
                disabled={!hasUnsavedChanges || busy}
                className="story-button-primary ml-1 min-h-11 px-4 py-2 disabled:opacity-50"
              >
                {busy ? "Updating…" : "Update live"}
              </button>
            </>
          ) : step === "write" ? (
            <button
              type="button"
              onClick={() => onStepChange("publish")}
              className="story-button-primary ml-1 min-h-11 px-4 py-2"
            >
              <span className="sm:hidden">Next</span>
              <span className="hidden sm:inline">Next: Publish details</span>
            </button>
          ) : null}
        </div>
      </div>

      <StepIndicator step={step} live={live} onStepChange={onStepChange} />
    </header>
  );
}
