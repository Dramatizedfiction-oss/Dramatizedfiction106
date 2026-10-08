"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SeriesFields, { type SeriesFormValues } from "@/components/writer-studio/series/SeriesFields";
import Sheet from "@/components/writer-studio/ui/Sheet";
import { updateSeries } from "@/lib/writer-studio/api";

/** "Edit details" for a series: explicit save, nothing changes until Save. */
export default function SeriesDetailsSheet({
  seriesId,
  initialValues,
  initiallyOpen = false,
}: {
  seriesId: string;
  initialValues: SeriesFormValues;
  initiallyOpen?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initiallyOpen);
  const [values, setValues] = useState(initialValues);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  const valid = values.title.trim() && values.genre && values.description.trim();

  function openSheet() {
    setValues(initialValues);
    setError(null);
    setOpen(true);
  }

  function requestClose() {
    if (dirty && !window.confirm("Discard your unsaved changes to this series?")) return;
    setOpen(false);
  }

  async function save() {
    if (!valid) return;
    setPending(true);
    setError(null);

    const result = await updateSeries(seriesId, {
      title: values.title.trim(),
      genre: values.genre,
      description: values.description.trim(),
      aiUsageTag: values.aiUsageTag,
      coverImage: values.coverImage.trim(),
      themeColor: values.themeColor.trim(),
    });

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
      <button type="button" onClick={openSheet} className="story-button-secondary">
        Edit details
      </button>
      <Sheet
        open={open}
        title="Series details"
        onRequestClose={requestClose}
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--studio-muted)]" aria-live="polite">
              {error ? <span className="text-[var(--status-danger)]">{error}</span> : dirty ? "Unsaved changes" : "No changes"}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={requestClose} className="story-button-secondary px-4 py-2">
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!dirty || !valid || pending}
                className="story-button-primary px-4 py-2 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        }
      >
        <SeriesFields values={values} onChange={setValues} />
      </Sheet>
    </>
  );
}
