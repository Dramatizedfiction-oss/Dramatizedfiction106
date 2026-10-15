"use client";

import AiUsageSelector from "@/components/AiUsageSelector";
import ImageUploadField from "@/components/uploads/ImageUploadField";
import type { AiUsageTag } from "@/lib/ai-usage";
import { GENRES } from "@/lib/genres";
import { MAX_SERIES_TAGS, SERIES_TAGS } from "@/lib/series-tags";
import { safeHexColor } from "@/lib/writer-studio/format";

export type SeriesFormValues = {
  title: string;
  genre: string;
  description: string;
  aiUsageTag: AiUsageTag;
  coverImage: string;
  themeColor: string;
  /** Shown to readers as Complete instead of Ongoing (series details only). */
  isComplete?: boolean;
  /** Sub tags from the fixed list (series details only). */
  tags?: string[];
};

const THEME_SWATCHES = ["#7c3aed", "#2563eb", "#0891b2", "#059669", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#475569"];

const labelClass = "theme-heading mb-2 block text-sm font-semibold";

/**
 * Series form fields. `basicOnly` shows what's needed to start a series;
 * cover and theme can be added later from the series hub.
 */
export default function SeriesFields({
  values,
  onChange,
  basicOnly = false,
  seriesId,
}: {
  values: SeriesFormValues;
  onChange: (next: SeriesFormValues) => void;
  basicOnly?: boolean;
  /** Needed for the cover upload (the server checks the series is yours). */
  seriesId?: string;
}) {
  const set = <K extends keyof SeriesFormValues>(key: K, value: SeriesFormValues[K]) =>
    onChange({ ...values, [key]: value });
  const genres: string[] = [...GENRES];
  if (values.genre && !genres.includes(values.genre)) genres.unshift(values.genre);

  return (
    <div className="space-y-6">
      <label className="block">
        <span className={labelClass}>Title</span>
        <input
          className="studio-field w-full px-4 py-3 text-sm"
          value={values.title}
          onChange={(event) => set("title", event.target.value)}
          placeholder="The name readers will see"
          maxLength={150}
          required
        />
      </label>

      <label className="block">
        <span className={labelClass}>Genre</span>
        <select
          className="studio-field w-full px-4 py-3 text-sm capitalize"
          value={values.genre}
          onChange={(event) => set("genre", event.target.value)}
          required
        >
          <option value="" disabled>
            Choose a genre
          </option>
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>Short description</span>
        <textarea
          className="studio-field w-full px-4 py-3 text-sm leading-6"
          rows={4}
          value={values.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="What is this story about? Shown on your series page."
          maxLength={2000}
          required
        />
      </label>

      <AiUsageSelector
        label="Series AI label"
        value={values.aiUsageTag}
        onChange={(tag) => set("aiUsageTag", tag)}
      />

      {!basicOnly ? (
        <>
          {seriesId ? (
            <ImageUploadField
              label="Cover image"
              purpose="series-cover"
              targetId={seriesId}
              value={values.coverImage}
              onChange={(url) => set("coverImage", url)}
              hint="A tall image works best (2:3). JPEG, PNG or WebP. Saved when you press Save."
            />
          ) : null}

          <fieldset>
            <legend className={labelClass}>Theme color</legend>
            <div className="flex flex-wrap items-center gap-2">
              {THEME_SWATCHES.map((color) => {
                const selected = safeHexColor(values.themeColor, "").toLowerCase() === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => set("themeColor", color)}
                    aria-label={`Theme color ${color}`}
                    aria-pressed={selected}
                    className={`h-8 w-8 rounded-full border-2 transition ${
                      selected ? "border-[var(--studio-text)]" : "border-transparent"
                    }`}
                    style={{ background: color }}
                  />
                );
              })}
              <label className="ml-1 inline-flex items-center gap-2 text-xs text-[var(--studio-muted)]">
                <input
                  type="color"
                  value={safeHexColor(values.themeColor)}
                  onChange={(event) => set("themeColor", event.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
                />
                Custom
              </label>
            </div>
          </fieldset>

          {values.tags !== undefined ? <TagPicker value={values.tags} onChange={(tags) => set("tags", tags)} /> : null}

          {values.isComplete !== undefined ? (
            <label className="flex min-h-11 cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={values.isComplete}
                onChange={(event) => set("isComplete", event.target.checked)}
                className="mt-1 h-5 w-5 accent-[var(--accent-solid)]"
              />
              <span>
                <span className="theme-heading block text-sm font-semibold">Series complete</span>
                <span className="mt-0.5 block text-xs text-[var(--studio-muted)]">
                  Readers see Complete instead of Ongoing. You can still add episodes.
                </span>
              </span>
            </label>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Up to MAX_SERIES_TAGS sub tags from the fixed list; they help readers find similar series. */
function TagPicker({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const full = value.length >= MAX_SERIES_TAGS;
  return (
    <fieldset>
      <legend className={labelClass}>
        Tags{" "}
        <span className="font-normal text-[var(--studio-muted)]">
          ({value.length} of {MAX_SERIES_TAGS})
        </span>
      </legend>
      <p className="-mt-1 mb-3 text-xs text-[var(--studio-muted)]">
        Pick up to {MAX_SERIES_TAGS}. They appear on your series page and help readers who liked similar stories find this one.
      </p>
      <div className="flex flex-wrap gap-2">
        {SERIES_TAGS.map((tag) => {
          const selected = value.includes(tag);
          const disabled = !selected && full;
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(selected ? value.filter((item) => item !== tag) : [...value, tag])}
              className={`min-h-11 rounded-full border px-3.5 text-sm transition disabled:opacity-40 ${
                selected
                  ? "border-transparent bg-[var(--accent-solid)] font-semibold text-[var(--accent-fg)]"
                  : "border-[var(--studio-border)] text-[var(--studio-text)] hover:bg-[var(--panel-hover)]"
              }`}
            >
              {selected ? "✓ " : ""}
              {tag}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}