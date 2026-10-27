"use client";

import Link from "next/link";
import { useState } from "react";
import AiUsageSelector from "@/components/AiUsageSelector";
import { CheckIcon, SendIcon } from "@/components/icons";
import EpisodeDetailsForm, { type EpisodeDetailsValues } from "@/components/writer-studio/editor/EpisodeDetailsForm";
import NewEpisodeButton from "@/components/writer-studio/series/NewEpisodeButton";
import type { AiUsageTag } from "@/lib/ai-usage";
import { knownSeriesTags } from "@/lib/series-tags";
import { plural } from "@/lib/writer-studio/format";

/*
 * Step 2 of the editor (Sweep F): everything about publishing, kept off the
 * writing page. The fields are part of the editor's working copy, so they
 * autosave like the text and survive moving between steps. Publishing is
 * unchanged: the editor saves, then POST /api/writer-studio/episodes/[id]/publish
 * with the same fields as before (it never sends status, number or author).
 * A live episode gets the same fields with Update live instead of Publish.
 */

export type PublishResult = { ok: true } | { ok: false; message: string };

const sectionClass = "rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-5";

export default function PublishStep({
  episode,
  series,
  title,
  wordCount,
  readTime,
  opening,
  live,
  values,
  readOnly,
  busy,
  hasUnsavedChanges,
  onChange,
  onEditWriting,
  onPublish,
  onUpdateLive,
}: {
  episode: { id: string; episodeNumber: number };
  series: { id: string; title: string; live: boolean; genre: string; tags: string[]; coverImage: string | null };
  title: string;
  wordCount: number;
  readTime: number;
  opening: string;
  live: boolean;
  values: EpisodeDetailsValues & { aiUsageTag: AiUsageTag };
  readOnly: boolean;
  busy: boolean;
  hasUnsavedChanges: boolean;
  onChange: (next: Partial<EpisodeDetailsValues & { aiUsageTag: AiUsageTag }>) => void;
  onEditWriting: () => void;
  onPublish: () => Promise<PublishResult>;
  onUpdateLive: () => void;
}) {
  const [aiConfirmed, setAiConfirmed] = useState(false);
  const [state, setState] = useState<"idle" | "publishing" | "published">("idle");
  const [error, setError] = useState<string | null>(null);

  const checks = [
    { ok: title.trim().length > 0, label: "The episode has a title" },
    { ok: wordCount > 0, label: "The episode has text" },
    { ok: aiConfirmed, label: "You've confirmed the AI label" },
  ];
  const ready = checks.every((check) => check.ok);
  const tags = knownSeriesTags(series.tags);

  async function handlePublish() {
    if (!ready || state === "publishing") return;
    setState("publishing");
    setError(null);
    const result = await onPublish();
    if (!result.ok) {
      setError(result.message);
      setState("idle");
      return;
    }
    setState("published");
  }

  if (state === "published") {
    return (
      <div className="mx-auto max-w-2xl py-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--status-live)] text-[var(--status-live)]">
          <CheckIcon size={26} />
        </span>
        <h1 className="font-heading theme-heading mt-6 text-3xl font-semibold">Episode {episode.episodeNumber} is live</h1>
        <p className="theme-meta mt-3 text-sm leading-6">Readers can now find it in {series.title}.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-start">
          <Link href={`/episode/${episode.id}`} className="story-button-secondary">
            View as reader
          </Link>
          <NewEpisodeButton seriesId={series.id} aiUsageTag={values.aiUsageTag} label="Write the next episode" />
        </div>
        <Link
          href={`/writer-studio/series/${series.id}`}
          className="theme-meta mt-4 inline-flex min-h-11 items-center text-sm transition hover:text-[var(--text-primary)]"
        >
          Back to series
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow">{live ? "Details" : "Publish"}</p>
      <h1 className="font-heading theme-heading mt-2 text-2xl font-semibold sm:text-3xl">
        {live ? "Episode details" : "Review before it goes live"}
      </h1>
      {live ? (
        <p className="theme-meta mt-2 text-sm leading-6">
          This episode is live. Changes here reach readers when you press <strong>Update live</strong>.
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <section className={sectionClass} aria-labelledby="publish-summary">
            <p id="publish-summary" className="theme-meta text-xs uppercase tracking-[0.18em]">
              {live ? "Published as" : "Will publish as"}
            </p>
            <p className="font-heading theme-heading mt-2 text-xl font-semibold">
              Episode {episode.episodeNumber} of {series.title}
            </p>
            <p className="theme-heading mt-3 break-words text-base">
              {title.trim() ? (
                title
              ) : (
                <span className="text-[var(--status-warning)]">No title yet</span>
              )}
            </p>
            <p className="theme-meta mt-1 text-sm">
              {plural(wordCount, "word")} · about {readTime} min to read
            </p>
            {!live && !series.live ? (
              <p className="mt-3 text-sm text-[var(--status-warning)]">
                This is the first published episode, so your series will become visible to readers too.
              </p>
            ) : null}
            {opening ? (
              <blockquote className="font-reading mt-4 border-l-2 border-[var(--studio-border)] pl-4 text-base italic leading-7 text-[var(--studio-text)]">
                {opening}
              </blockquote>
            ) : null}
            <button
              type="button"
              onClick={onEditWriting}
              className="theme-meta mt-3 inline-flex min-h-11 items-center text-sm transition hover:text-[var(--text-primary)]"
            >
              ← Edit the title or text
            </button>
          </section>

          <section className={sectionClass} aria-label="Episode details">
            <EpisodeDetailsForm values={values} onChange={onChange} readOnly={readOnly} episodeId={episode.id} live={live} />
          </section>

          <section className={`${sectionClass} space-y-4`} aria-label="AI label">
            <fieldset disabled={readOnly}>
              <AiUsageSelector
                label="AI label"
                value={values.aiUsageTag}
                onChange={(tag) => {
                  onChange({ aiUsageTag: tag });
                  setAiConfirmed(false);
                }}
              />
            </fieldset>
            {!live ? (
              <label className="flex items-start gap-3 text-sm text-[var(--studio-text)]">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={aiConfirmed}
                  onChange={(event) => setAiConfirmed(event.target.checked)}
                />
                <span>
                  I confirm <strong>{values.aiUsageTag}</strong> accurately describes how AI was used in this episode. Readers
                  see this label.
                </span>
              </label>
            ) : null}
          </section>

          <section className={sectionClass} aria-labelledby="publish-series">
            <p id="publish-series" className="theme-heading text-sm font-semibold">
              Series details
            </p>
            <p className="theme-meta mt-1 text-sm">Genre, tags and cover belong to the whole series.</p>
            <div className="mt-4 flex gap-4">
              {series.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={series.coverImage} alt="" className="h-24 w-16 shrink-0 rounded-md object-cover" />
              ) : null}
              <dl className="min-w-0 space-y-2 text-sm">
                <div>
                  <dt className="theme-meta text-xs">Genre</dt>
                  <dd className="theme-heading mt-0.5 capitalize">{series.genre.trim() || "No genre yet"}</dd>
                </div>
                <div>
                  <dt className="theme-meta text-xs">Tags</dt>
                  <dd className="theme-heading mt-0.5">{tags.length ? tags.join(" · ") : "None"}</dd>
                </div>
              </dl>
            </div>
            <Link
              href={`/writer-studio/series/${series.id}?edit=details`}
              className="theme-meta mt-3 inline-flex min-h-11 items-center text-sm transition hover:text-[var(--text-primary)]"
            >
              Edit series details →
            </Link>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[116px] lg:self-start">
          {live ? (
            <section className={sectionClass}>
              <p className="theme-heading text-sm font-semibold">Update the live episode</p>
              <p className="theme-meta mt-2 text-sm leading-6">
                {hasUnsavedChanges ? "You have changes that aren't live yet." : "Readers see everything saved here."}
              </p>
              <button
                type="button"
                onClick={onUpdateLive}
                disabled={!hasUnsavedChanges || busy}
                className="story-button-primary mt-5 w-full disabled:opacity-50"
              >
                {busy ? "Updating…" : "Update live"}
              </button>
              <Link href={`/episode/${episode.id}`} className="story-button-secondary mt-3 w-full">
                View live
              </Link>
            </section>
          ) : (
            <section className={sectionClass}>
              <p className="theme-heading text-sm font-semibold">Before you publish</p>
              <ul className="mt-3 space-y-2 text-sm">
                {checks.map((check) => (
                  <li
                    key={check.label}
                    className={`flex items-center gap-2 ${check.ok ? "text-[var(--studio-text)]" : "text-[var(--studio-muted)]"}`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        check.ok ? "border-[var(--status-live)] text-[var(--status-live)]" : "border-[var(--studio-border)]"
                      }`}
                    >
                      {check.ok ? <CheckIcon size={12} /> : null}
                    </span>
                    {check.label}
                    <span className="sr-only">{check.ok ? "(done)" : "(not done)"}</span>
                  </li>
                ))}
              </ul>

              {error ? (
                <p role="alert" className="mt-4 text-sm text-[var(--status-danger)]">
                  {error}
                </p>
              ) : null}

              <button
                type="button"
                onClick={handlePublish}
                disabled={!ready || state === "publishing" || readOnly}
                className="story-button-primary mt-5 w-full gap-2 disabled:opacity-50"
              >
                <SendIcon size={16} />
                {state === "publishing" ? "Publishing…" : "Publish episode"}
              </button>
              <button type="button" onClick={onEditWriting} className="story-button-secondary mt-3 w-full">
                Back to writing
              </button>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
