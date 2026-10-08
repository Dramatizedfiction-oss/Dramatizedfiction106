"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AiUsageSelector from "@/components/AiUsageSelector";
import { ArrowLeftIcon, CheckIcon, SendIcon } from "@/components/icons";
import NewEpisodeButton from "@/components/writer-studio/series/NewEpisodeButton";
import type { AiUsageTag } from "@/lib/ai-usage";
import { publishEpisode } from "@/lib/writer-studio/api";
import { plural } from "@/lib/writer-studio/format";

/*
 * Review -> confirm AI label -> publish -> success. The only publisher is
 * POST /api/writer-studio/episodes/[id]/publish; this form never sends
 * status, episode number, author or the premium flag.
 */

type ReviewEpisode = {
  id: string;
  title: string;
  description: string;
  contentWarning: string;
  coverImage: string;
  aiUsageTag: AiUsageTag;
  episodeNumber: number;
  live: boolean;
  wordCount: number;
  readTime: number;
  opening: string;
};

export default function PublishReview({
  episode,
  series,
}: {
  episode: ReviewEpisode;
  series: { id: string; title: string; live: boolean };
}) {
  const router = useRouter();
  const [title, setTitle] = useState(episode.title);
  const [description, setDescription] = useState(episode.description);
  const [contentWarning, setContentWarning] = useState(episode.contentWarning);
  const [aiUsageTag, setAiUsageTag] = useState<AiUsageTag>(episode.aiUsageTag);
  const [aiConfirmed, setAiConfirmed] = useState(false);
  const [state, setState] = useState<"idle" | "publishing" | "published" | "alreadyLive">(
    episode.live ? "alreadyLive" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const checks = [
    { ok: title.trim().length > 0, label: "The episode has a title" },
    { ok: episode.wordCount > 0, label: "The episode has text" },
    { ok: aiConfirmed, label: "You've confirmed the AI label" },
  ];
  const ready = checks.every((check) => check.ok);

  async function handlePublish() {
    if (!ready || state === "publishing") return;
    setState("publishing");
    setError(null);

    const result = await publishEpisode(episode.id, {
      title: title.trim(),
      description,
      contentWarning,
      aiUsageTag,
    });

    if (!result.ok) {
      setError(result.message);
      setState("idle");
      return;
    }

    setState("published");
    router.refresh();
  }

  const backBar = (
    <div className="sticky top-0 z-50 border-b border-[var(--studio-border)] bg-[var(--header-bg)] backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
        <Link href={`/writer-studio/episodes/${episode.id}`} className="studio-tool" aria-label="Back to editor">
          <ArrowLeftIcon size={18} />
        </Link>
        <p className="truncate text-sm text-[var(--studio-muted)]">
          {series.title} › Episode {episode.episodeNumber}
        </p>
      </div>
    </div>
  );

  if (state === "published" || state === "alreadyLive") {
    return (
      <>
        {backBar}
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--status-live)] text-[var(--status-live)]">
            <CheckIcon size={26} />
          </span>
          <h1 className="font-heading theme-heading mt-6 text-3xl font-semibold">
            Episode {episode.episodeNumber} is live
          </h1>
          <p className="theme-meta mt-3 text-sm leading-6">
            {state === "alreadyLive"
              ? "This episode is already published. Edits you make in the editor go live when you press Update live."
              : `Readers can now find it in ${series.title}.`}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-start">
            <Link href={`/episode/${episode.id}`} className="story-button-secondary">
              View as reader
            </Link>
            <NewEpisodeButton seriesId={series.id} aiUsageTag={aiUsageTag} label="Write the next episode" />
          </div>
          <Link
            href={`/writer-studio/series/${series.id}`}
            className="theme-meta mt-6 inline-block text-sm transition hover:text-[var(--text-primary)]"
          >
            Back to series
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      {backBar}
      <main className="mx-auto max-w-4xl px-4 py-8 md:py-12">
        <p className="eyebrow">Publish</p>
        <h1 className="font-heading theme-heading mt-2 text-3xl font-semibold">Review before it goes live</h1>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-5">
              <p className="theme-meta text-xs uppercase tracking-[0.18em]">Will publish as</p>
              <p className="font-heading theme-heading mt-2 text-xl font-semibold">
                Episode {episode.episodeNumber} of {series.title}
              </p>
              <p className="theme-meta mt-1 text-sm">
                {plural(episode.wordCount, "word")} · about {episode.readTime} min to read
              </p>
              {!series.live ? (
                <p className="mt-3 text-sm text-[var(--status-warning)]">
                  This is the first published episode, so your series will become visible to readers too.
                </p>
              ) : null}
              {episode.opening ? (
                <blockquote className="font-reading mt-4 border-l-2 border-[var(--studio-border)] pl-4 text-base italic leading-7 text-[var(--studio-text)]">
                  {episode.opening}
                </blockquote>
              ) : null}
              <Link
                href={`/writer-studio/episodes/${episode.id}/preview`}
                className="theme-meta mt-4 inline-block text-sm transition hover:text-[var(--text-primary)]"
              >
                Preview the full episode →
              </Link>
            </section>

            <section className="space-y-5 rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-5">
              <label className="block">
                <span className="theme-heading mb-2 block text-sm font-semibold">Title</span>
                <input
                  className="studio-field w-full px-4 py-3 text-sm"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Give this episode a title"
                  maxLength={200}
                />
              </label>
              <label className="block">
                <span className="theme-heading mb-2 block text-sm font-semibold">Short description</span>
                <textarea
                  className="studio-field w-full px-4 py-3 text-sm leading-6"
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional"
                  maxLength={1000}
                />
              </label>
              <label className="block">
                <span className="theme-heading mb-2 block text-sm font-semibold">Content warning</span>
                <input
                  className="studio-field w-full px-4 py-3 text-sm"
                  value={contentWarning}
                  onChange={(event) => setContentWarning(event.target.value)}
                  placeholder="Optional"
                  maxLength={300}
                />
              </label>
            </section>

            <section className="space-y-4 rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-5">
              <AiUsageSelector
                label="AI label"
                value={aiUsageTag}
                onChange={(tag) => {
                  setAiUsageTag(tag);
                  setAiConfirmed(false);
                }}
              />
              <label className="flex items-start gap-3 text-sm text-[var(--studio-text)]">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={aiConfirmed}
                  onChange={(event) => setAiConfirmed(event.target.checked)}
                />
                <span>
                  I confirm <strong>{aiUsageTag}</strong> accurately describes how AI was used in this episode.
                  Readers see this label.
                </span>
              </label>
            </section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <section className="rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] p-5">
              <p className="theme-heading text-sm font-semibold">Before you publish</p>
              <ul className="mt-3 space-y-2 text-sm">
                {checks.map((check) => (
                  <li
                    key={check.label}
                    className={`flex items-center gap-2 ${check.ok ? "text-[var(--studio-text)]" : "text-[var(--studio-muted)]"}`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
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
                disabled={!ready || state === "publishing"}
                className="story-button-primary mt-5 w-full gap-2 disabled:opacity-50"
              >
                <SendIcon size={16} />
                {state === "publishing" ? "Publishing…" : "Publish episode"}
              </button>
              <Link href={`/writer-studio/episodes/${episode.id}`} className="story-button-secondary mt-3 w-full">
                Keep editing
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
