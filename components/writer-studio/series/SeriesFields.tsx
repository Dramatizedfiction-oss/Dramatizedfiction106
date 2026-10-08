"use client";

import AiUsageSelector from "@/components/AiUsageSelector";
import type { AiUsageTag } from "@/lib/ai-usage";
import { GENRES } from "@/lib/genres";
import { safeHexColor, safeImageUrl } from "@/lib/writer-studio/format";

export type SeriesFormValues = {
  title: string;
  genre: string;
  description: string;
  aiUsageTag: AiUsageTag;
  coverImage: string;
  themeColor: string;
};

const THEME_SWATCHES = ["#7c3aed", "#2563eb", "#0891b2", "#059669", "#ca8a04", "#ea580c", "#dc2626", "#db2777", "#475569"];

const labelClass = "theme-heading mb-2 block text-sm font-semibold";
const hintClass = "theme-meta mt-1.5 block text-xs";

/**
 * Series form fields. `basicOnly` shows what's needed to start a series;
 * cover and theme can be added later from the series hub.
 */
export default function SeriesFields({
  values,
  onChange,
  basicOnly = false,
}: {
  values: SeriesFormValues;
  onChange: (next: SeriesFormValues) => void;
  basicOnly?: boolean;
}) {
  const set = <K extends keyof SeriesFormValues>(key: K, value: SeriesFormValues[K]) =>
    onChange({ ...values, [key]: value });
  const genres: string[] = [...GENRES];
  if (values.genre && !genres.includes(values.genre)) genres.unshift(values.genre);
  const coverPreview = safeImageUrl(values.coverImage);

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
          <div>
            <label className="block">
              <span className={labelClass}>Cover image URL</span>
              <input
                className="studio-field w-full px-4 py-3 text-sm"
                value={values.coverImage}
                onChange={(event) => set("coverImage", event.target.value)}
                placeholder="https://…"
                inputMode="url"
              />
              <span className={hintClass}>Paste a link to an image. Uploads aren&apos;t available yet.</span>
            </label>
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverPreview}
                alt="Cover preview"
                className="mt-3 h-40 w-28 rounded-lg border border-[var(--studio-border)] object-cover"
              />
            ) : null}
          </div>

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
        </>
      ) : null}
    </div>
  );
}
