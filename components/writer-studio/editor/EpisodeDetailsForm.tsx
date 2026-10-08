"use client";

import Link from "next/link";
import AiUsageSelector from "@/components/AiUsageSelector";
import type { AiUsageTag } from "@/lib/ai-usage";
import { plural } from "@/lib/writer-studio/format";

export type EpisodeDetailsValues = {
  description: string;
  contentWarning: string;
  coverImage: string;
  aiUsageTag: AiUsageTag;
};

const labelClass = "theme-heading mb-2 block text-sm font-semibold";

/** The episode's metadata, kept beside the manuscript instead of above it. */
export default function EpisodeDetailsForm({
  values,
  onChange,
  readOnly,
  meta,
}: {
  values: EpisodeDetailsValues;
  onChange: (next: EpisodeDetailsValues) => void;
  readOnly: boolean;
  meta: { seriesId: string; episodeNumber: number; live: boolean; wordCount: number; readTime: number };
}) {
  const set = <K extends keyof EpisodeDetailsValues>(key: K, value: EpisodeDetailsValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--studio-border)] p-4 text-sm">
        <div>
          <dt className="theme-meta text-xs">Episode</dt>
          <dd className="theme-heading mt-0.5 font-semibold">{meta.episodeNumber}</dd>
        </div>
        <div>
          <dt className="theme-meta text-xs">Status</dt>
          <dd className="theme-heading mt-0.5 font-semibold">{meta.live ? "Live" : "Draft"}</dd>
        </div>
        <div>
          <dt className="theme-meta text-xs">Length</dt>
          <dd className="theme-heading mt-0.5 font-semibold">{plural(meta.wordCount, "word")}</dd>
        </div>
        <div>
          <dt className="theme-meta text-xs">Estimated read</dt>
          <dd className="theme-heading mt-0.5 font-semibold">{meta.readTime} min</dd>
        </div>
      </dl>

      <fieldset disabled={readOnly} className="space-y-6">
        <AiUsageSelector label="AI label" value={values.aiUsageTag} onChange={(tag) => set("aiUsageTag", tag)} />

        <label className="block">
          <span className={labelClass}>Short description</span>
          <textarea
            className="studio-field w-full px-3 py-2.5 text-sm leading-6"
            rows={3}
            value={values.description}
            onChange={(event) => set("description", event.target.value)}
            placeholder="A line or two about this episode"
            maxLength={1000}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Content warning</span>
          <input
            className="studio-field w-full px-3 py-2.5 text-sm"
            value={values.contentWarning}
            onChange={(event) => set("contentWarning", event.target.value)}
            placeholder="Optional, e.g. violence, grief"
            maxLength={300}
          />
        </label>

        <label className="block">
          <span className={labelClass}>Cover image URL</span>
          <input
            className="studio-field w-full px-3 py-2.5 text-sm"
            value={values.coverImage}
            onChange={(event) => set("coverImage", event.target.value)}
            placeholder="https://…"
            inputMode="url"
          />
          <span className="theme-meta mt-1.5 block text-xs">Optional. Uploads aren&apos;t available yet.</span>
        </label>
      </fieldset>

      <Link
        href={`/writer-studio/series/${meta.seriesId}?edit=details`}
        className="theme-meta inline-block text-sm transition hover:text-[var(--text-primary)]"
      >
        Edit series details →
      </Link>
    </div>
  );
}
