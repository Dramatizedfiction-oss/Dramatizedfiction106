"use client";

import { useEffect, useState } from "react";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { DEFAULT_READING_PREFS, loadReadingPrefs, saveReadingPrefs, type ReadingPrefs } from "@/lib/reading-prefs";

/*
 * Text size, line spacing, reading width and motion, saved on this device as
 * soon as they change. The preview uses the same .reader-column/.reading-body
 * styles as the episode reader, so it shows exactly what readers get.
 */

const CONTROLS: { key: keyof ReadingPrefs; label: string; hint: string; options: { value: string; label: string }[] }[] = [
  {
    key: "size",
    label: "Text size",
    hint: "Size of the story text in the reader.",
    options: [
      { value: "sm", label: "Small" },
      { value: "default", label: "Default" },
      { value: "lg", label: "Large" },
      { value: "xl", label: "Extra large" },
    ],
  },
  {
    key: "spacing",
    label: "Line spacing",
    hint: "Space between lines of the story.",
    options: [
      { value: "compact", label: "Compact" },
      { value: "default", label: "Default" },
      { value: "relaxed", label: "Relaxed" },
    ],
  },
  {
    key: "width",
    label: "Reading width",
    hint: "How wide the story column gets on larger screens.",
    options: [
      { value: "narrow", label: "Narrow" },
      { value: "default", label: "Default" },
      { value: "wide", label: "Wide" },
    ],
  },
  {
    key: "motion",
    label: "Reduce motion",
    hint: "“Always reduce” stops animations even if your device setting is off.",
    options: [
      { value: "device", label: "Follow device" },
      { value: "always", label: "Always reduce" },
    ],
  },
];

export default function ReadingPreferences() {
  const [prefs, setPrefs] = useState<ReadingPrefs>(DEFAULT_READING_PREFS);

  useEffect(() => setPrefs(loadReadingPrefs()), []);

  function change<K extends keyof ReadingPrefs>(key: K, value: ReadingPrefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveReadingPrefs(next);
  }

  const isDefault = JSON.stringify(prefs) === JSON.stringify(DEFAULT_READING_PREFS);

  return (
    <div className="space-y-6">
      {CONTROLS.map((control) => (
        <div key={control.key}>
          <p className="theme-heading text-sm font-semibold">{control.label}</p>
          <p className="theme-meta mb-2 mt-0.5 text-xs">{control.hint}</p>
          <SegmentedControl
            label={control.label}
            options={control.options}
            value={prefs[control.key]}
            onChange={(value) => change(control.key, value as never)}
          />
        </div>
      ))}

      <div>
        <p className="theme-heading text-sm font-semibold">Preview</p>
        <div className="reader-page mt-2 overflow-hidden rounded-[20px] border border-[var(--border-color)] py-6" aria-live="polite">
          <div className="reader-column">
            <div className="reading-body">
              <p>
                The rain had stopped by the time Mara reached the station, but the platform still shone like a mirror. She
                checked the board twice, then a third time, as if the departure might change its mind.
              </p>
              <p>
                Somewhere behind her, a door slammed. She didn&apos;t turn around. Some stories, she had learned, are best
                read without looking back.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isDefault}
          onClick={() => {
            setPrefs(DEFAULT_READING_PREFS);
            saveReadingPrefs(DEFAULT_READING_PREFS);
          }}
          className="story-button-secondary min-h-11 disabled:opacity-50"
        >
          Reset to defaults
        </button>
        <p className="theme-meta text-xs">Saved on this device automatically.</p>
      </div>
    </div>
  );
}
