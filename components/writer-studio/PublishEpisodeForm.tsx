"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PublishEpisodeFormProps = {
  episode: {
    id: string;
    title: string;
    description: string;
    coverImage: string;
    contentWarning: string;
    aiUsageTag: string;
    locked: boolean;
    seriesTitle: string;
  };
};

export default function PublishEpisodeForm({ episode }: PublishEpisodeFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(episode.title);
  const [description, setDescription] = useState(episode.description);
  const [coverImage, setCoverImage] = useState(episode.coverImage);
  const [contentWarning, setContentWarning] = useState(episode.contentWarning);
  const [aiUsageTag, setAiUsageTag] = useState(episode.aiUsageTag);
  const [locked, setLocked] = useState(episode.locked);
  const [publishing, setPublishing] = useState(false);

  async function handlePublish() {
    setPublishing(true);
    try {
      const response = await fetch(`/api/writer-studio/episodes/${episode.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title,
          description,
          coverImage,
          contentWarning,
          aiUsageTag,
          locked,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        alert(payload?.error || "Could not publish episode.");
        return;
      }

      router.push(payload.seriesId ? `/series/${payload.seriesId}` : "/writer-studio");
      router.refresh();
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
        <p className="eyebrow">Publishing Details</p>
        <h1 className="font-heading mt-3 text-3xl font-semibold">{title || "Untitled Episode"}</h1>
        <p className="theme-meta mt-2 text-sm">
          Review the final information before the episode goes live from <span className="font-semibold">{episode.seriesTitle}</span>.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Episode Title</span>
              <input
                className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Episode Description</span>
              <textarea
                className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Cover Image</span>
              <input
                className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Content Warnings</span>
              <input
                className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
                value={contentWarning}
                onChange={(e) => setContentWarning(e.target.value)}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-sm font-medium">AI Label</span>
                <select
                  className="theme-panel rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm"
                  value={aiUsageTag}
                  onChange={(e) => setAiUsageTag(e.target.value)}
                >
                  <option value="AI FREE">AI FREE</option>
                  <option value="AI CORRECTED">AI CORRECTED</option>
                  <option value="AI HEAVY">AI HEAVY</option>
                  <option value="AI WRITTEN">AI WRITTEN</option>
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-[18px] border border-[var(--border-color)] px-4 py-3 text-sm">
                <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
                <span>Premium</span>
              </label>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
            <p className="eyebrow">Review</p>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="theme-meta text-xs uppercase tracking-[0.24em]">Series</p>
                <p className="mt-1 font-medium">{episode.seriesTitle}</p>
              </div>
              <div>
                <p className="theme-meta text-xs uppercase tracking-[0.24em]">Episode</p>
                <p className="mt-1 font-medium">{title || "Untitled Episode"}</p>
              </div>
              <div>
                <p className="theme-meta text-xs uppercase tracking-[0.24em]">Access</p>
                <p className="mt-1 font-medium">{locked ? "Premium" : "Free"}</p>
              </div>
              <div>
                <p className="theme-meta text-xs uppercase tracking-[0.24em]">AI Label</p>
                <p className="mt-1 font-medium">{aiUsageTag}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
            <p className="eyebrow">Publish</p>
            <p className="theme-meta mt-3 text-sm leading-6">
              Once published, this episode becomes visible in the main app and inside its series.
            </p>
            <button
              type="button"
              className="story-button-primary mt-5 w-full"
              onClick={handlePublish}
              disabled={publishing}
            >
              {publishing ? "Publishing..." : "Publish Episode"}
            </button>
            <button
              type="button"
              className="story-button-secondary mt-3 w-full"
              onClick={() => router.back()}
            >
              Back
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
