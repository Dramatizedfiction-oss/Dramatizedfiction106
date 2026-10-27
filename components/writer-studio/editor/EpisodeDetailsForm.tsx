"use client";

import ImageUploadField from "@/components/uploads/ImageUploadField";

export type EpisodeDetailsValues = {
  description: string;
  contentWarning: string;
  coverImage: string;
};

const labelClass = "theme-heading mb-2 block text-sm font-semibold";

/** The episode's publishing details (Publish step): description, content warning, cover. */
export default function EpisodeDetailsForm({
  values,
  onChange,
  readOnly,
  episodeId,
  live,
}: {
  values: EpisodeDetailsValues;
  onChange: (next: Partial<EpisodeDetailsValues>) => void;
  readOnly: boolean;
  episodeId: string;
  live: boolean;
}) {
  return (
    <div className="space-y-6">
      <fieldset disabled={readOnly} className="space-y-6">
        <label className="block">
          <span className={labelClass}>Short description</span>
          <textarea
            className="studio-field w-full px-3 py-2.5 text-sm leading-6"
            rows={3}
            value={values.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="A line or two about this episode"
            maxLength={1000}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Content warning</span>
          <input
            className="studio-field w-full px-3 py-2.5 text-sm"
            value={values.contentWarning}
            onChange={(event) => onChange({ contentWarning: event.target.value })}
            placeholder="Optional, e.g. violence, grief"
            maxLength={300}
          />
        </label>
      </fieldset>

      <ImageUploadField
        label="Episode image"
        purpose="episode-cover"
        targetId={episodeId}
        value={values.coverImage}
        onChange={(url) => onChange({ coverImage: url })}
        disabled={readOnly}
        hint={live ? "Optional. Goes live when you press Update live." : "Optional. JPEG, PNG or WebP; saved with your draft."}
      />
    </div>
  );
}
