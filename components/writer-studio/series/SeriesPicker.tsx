"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createEpisode } from "@/lib/writer-studio/api";
import { plural, safeHexColor, safeImageUrl } from "@/lib/writer-studio/format";

type PickerSeries = {
  id: string;
  title: string;
  genre: string;
  coverImage: string | null;
  themeColor: string | null;
  aiUsageTag: string;
  episodeCount: number;
};

/** One click: creates the next episode in the chosen series and opens it. */
export default function SeriesPicker({ series }: { series: PickerSeries[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(item: PickerSeries) {
    setPendingId(item.id);
    setError(null);
    const result = await createEpisode(item.id, item.aiUsageTag);

    if (!result.ok) {
      setError(result.message);
      setPendingId(null);
      return;
    }

    router.push(`/writer-studio/episodes/${result.data.episode.id}`);
  }

  return (
    <div className="space-y-2">
      {series.map((item) => {
        const accent = safeHexColor(item.themeColor);
        const cover = safeImageUrl(item.coverImage);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => pick(item)}
            disabled={pendingId !== null}
            className="flex w-full items-center gap-4 rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-surface)] px-4 py-3 text-left transition hover:border-[var(--studio-muted)] disabled:opacity-60"
          >
            <span
              className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md"
              style={{ background: `linear-gradient(160deg, ${accent}, ${accent}33)` }}
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="theme-heading block truncate font-semibold">{item.title}</span>
              <span className="mt-0.5 block text-xs capitalize text-[var(--studio-muted)]">
                {item.genre} · {plural(item.episodeCount, "episode")}
              </span>
            </span>
            <span className="shrink-0 text-sm text-[var(--studio-muted)]">
              {pendingId === item.id ? "Creating…" : "Write next episode →"}
            </span>
          </button>
        );
      })}
      {error ? (
        <p role="alert" className="text-sm text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
