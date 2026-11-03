"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Sheet from "@/components/writer-studio/ui/Sheet";
import { SEASON_DESCRIPTION_MAX, SEASON_TITLE_MAX, seasonLabel, type SeasonStatusValue } from "@/lib/season-rules";
import { addSeason, deleteSeason, updateSeason } from "@/lib/writer-studio/api";

/*
 * Add a season, or edit one (Sweep G): title, description, Ongoing/Complete,
 * and Delete for an empty season. Explicit save, like Series details. The
 * server checks everything again (lib/season-rules.ts parseSeasonFields).
 */

export type SeasonSheetSeason = {
  id: string;
  number: number;
  title: string | null;
  description: string | null;
  status: SeasonStatusValue;
  episodeCount: number;
};

type Values = { title: string; description: string; status: SeasonStatusValue };

const labelClass = "theme-heading mb-2 block text-sm font-semibold";

/** "+ Add season" (usable from server pages, which can't pass a trigger function). */
export function AddSeasonButton({ seriesId, nextNumber }: { seriesId: string; nextNumber: number }) {
  return (
    <SeasonSheet
      seriesId={seriesId}
      nextNumber={nextNumber}
      trigger={(open) => (
        <button type="button" onClick={open} className="story-button-secondary">
          + Add season
        </button>
      )}
    />
  );
}

export default function SeasonSheet({
  seriesId,
  season,
  nextNumber,
  isOnlySeason = false,
  trigger,
}: {
  seriesId: string;
  /** Omitted: the sheet adds a new season. */
  season?: SeasonSheetSeason;
  /** The number a new season will get. */
  nextNumber?: number;
  isOnlySeason?: boolean;
  trigger: (open: () => void) => React.ReactNode;
}) {
  const router = useRouter();
  const initial: Values = {
    title: season?.title ?? "",
    description: season?.description ?? "",
    status: season?.status ?? "ONGOING",
  };
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = !season || JSON.stringify(values) !== JSON.stringify(initial);
  const heading = season ? `Edit ${seasonLabel({ number: season.number })}` : `Add Season ${nextNumber ?? ""}`.trim();
  const deleteBlocked = !season
    ? null
    : isOnlySeason
      ? "A series always keeps at least one season."
      : season.episodeCount > 0
        ? "Move this season's episodes to another season before deleting it."
        : null;

  function openSheet() {
    setValues(initial);
    setError(null);
    setOpen(true);
  }

  function requestClose() {
    if (season && dirty && !window.confirm("Discard your unsaved changes to this season?")) return;
    setOpen(false);
  }

  async function save() {
    setPending(true);
    setError(null);
    const input = { title: values.title.trim() || null, description: values.description.trim() || null };
    const result = season ? await updateSeason(season.id, { ...input, status: values.status }) : await addSeason(seriesId, input);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!season || deleteBlocked) return;
    if (!window.confirm(`Delete ${seasonLabel(season)}? It has no episodes, so nothing else changes.`)) return;
    setPending(true);
    setError(null);
    const result = await deleteSeason(season.id);
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {trigger(openSheet)}
      <Sheet
        open={open}
        title={heading}
        onRequestClose={requestClose}
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 text-xs text-[var(--studio-muted)]" aria-live="polite">
              {error ? <span className="text-[var(--status-danger)]">{error}</span> : season ? (dirty ? "Unsaved changes" : "No changes") : ""}
            </p>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={requestClose} className="story-button-secondary px-4 py-2">
                Cancel
              </button>
              <button type="button" onClick={save} disabled={!dirty || pending} className="story-button-primary px-4 py-2 disabled:opacity-50">
                {pending ? "Saving…" : season ? "Save" : "Add season"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {!season ? (
            <p className="theme-meta text-sm leading-6">
              A new season starts empty and stays hidden from readers until it has a published episode.
            </p>
          ) : null}

          <label className="block">
            <span className={labelClass}>Title (optional)</span>
            <input
              className="studio-field w-full px-3 py-2.5 text-sm"
              value={values.title}
              onChange={(event) => setValues({ ...values, title: event.target.value })}
              placeholder="e.g. The Salt War"
              maxLength={SEASON_TITLE_MAX}
            />
            <span className="theme-meta mt-1 block text-right text-xs">
              {values.title.length}/{SEASON_TITLE_MAX}
            </span>
          </label>

          <label className="block">
            <span className={labelClass}>Short description (optional)</span>
            <textarea
              className="studio-field w-full px-3 py-2.5 text-sm leading-6"
              rows={3}
              value={values.description}
              onChange={(event) => setValues({ ...values, description: event.target.value })}
              placeholder="A line or two about this season"
              maxLength={SEASON_DESCRIPTION_MAX}
            />
            <span className="theme-meta mt-1 block text-right text-xs">
              {values.description.length}/{SEASON_DESCRIPTION_MAX}
            </span>
          </label>

          {season ? (
            <div>
              <p className={labelClass}>Status</p>
              <SegmentedControl
                label="Season status"
                options={[
                  { value: "ONGOING", label: "Ongoing" },
                  { value: "COMPLETE", label: "Complete" },
                ]}
                value={values.status}
                onChange={(status) => setValues({ ...values, status })}
              />
              <p className="theme-meta mt-2 text-xs leading-5">
                This is the season&apos;s own status. The whole series is marked complete in Series details.
              </p>
            </div>
          ) : null}

          {season ? (
            <div className="border-t border-[var(--studio-border)] pt-5">
              <button
                type="button"
                onClick={remove}
                disabled={Boolean(deleteBlocked) || pending}
                className="story-button-secondary px-4 py-2 text-[var(--status-danger)] disabled:opacity-50"
              >
                Delete season
              </button>
              {deleteBlocked ? <p className="theme-meta mt-2 text-xs">{deleteBlocked}</p> : null}
            </div>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
