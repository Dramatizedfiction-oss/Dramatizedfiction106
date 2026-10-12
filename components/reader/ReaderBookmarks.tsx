"use client";

import Link from "next/link";
import { useState } from "react";
import type { BookmarkEntry } from "@/lib/bookmarks";
import { timeAgo } from "@/lib/engagement-rules";
import { safeHexColor, safeImageUrl } from "@/lib/writer-studio/format";

/**
 * The member's own Bookmarks (episodes saved from the reader), newest first,
 * with Remove and "Show more". Only ever rendered on the member's own /reader.
 */
export default function ReaderBookmarks({ initial }: { initial: { bookmarks: BookmarkEntry[]; nextCursor: string | null } }) {
  const [entries, setEntries] = useState(initial.bookmarks);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor || pending) return;
    setPending("more");
    setError(null);
    try {
      const response = await fetch(`/api/me/bookmarks?before=${encodeURIComponent(cursor)}`);
      const data = (await response.json().catch(() => null)) as { bookmarks?: BookmarkEntry[]; nextCursor?: string | null } | null;
      if (!response.ok || !data?.bookmarks) throw new Error();
      const seen = new Set(entries.map((entry) => entry.episodeId));
      setEntries((current) => [...current, ...data.bookmarks!.filter((entry) => !seen.has(entry.episodeId))]);
      setCursor(data.nextCursor ?? null);
    } catch {
      setError("Couldn't load more bookmarks. Please try again.");
    } finally {
      setPending(null);
    }
  }

  async function remove(entry: BookmarkEntry) {
    if (pending) return;
    setPending(entry.episodeId);
    setError(null);
    try {
      const response = await fetch(`/api/me/bookmarks/${encodeURIComponent(entry.episodeId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setEntries((current) => current.filter((item) => item.episodeId !== entry.episodeId));
    } catch {
      setError("Couldn't remove that bookmark. Please try again.");
    } finally {
      setPending(null);
    }
  }

  if (entries.length === 0) {
    return (
      <div className="theme-panel rounded-[24px] border border-dashed border-[var(--border-color)] px-5 py-10 text-center sm:px-8 sm:py-14">
        <p className="eyebrow">Bookmarks</p>
        <h2 className="font-heading theme-heading mt-2 text-balance text-2xl font-semibold">No bookmarks yet</h2>
        <p className="theme-meta mx-auto mt-3 max-w-md text-sm leading-6">
          Tap the bookmark icon while reading an episode and it will be saved here.
        </p>
        <Link href="/explore" className="story-button-primary mt-6 min-h-11">
          Explore series
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="sr-only">Bookmarks</h2>
      <p className="theme-meta text-sm">Only you can see your bookmarks.</p>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => {
          const cover = safeImageUrl(entry.coverImage);
          const accent = safeHexColor(entry.themeColor);
          return (
            <li key={entry.episodeId} className="flex min-w-0 items-stretch gap-1 rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-secondary)]">
              <Link href={`/episode/${entry.episodeId}`} className="theme-panel-hover flex min-h-[96px] min-w-0 flex-1 items-center gap-4 rounded-[20px] p-3 transition">
                <span
                  className="relative h-[84px] w-[63px] shrink-0 overflow-hidden rounded-xl"
                  style={{ background: `linear-gradient(160deg, ${accent}, ${accent}33)` }}
                >
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="theme-meta block truncate font-mono-df text-[10px] uppercase tracking-[0.18em]">
                    {entry.seriesTitle} · Ep {entry.episodeNumber}
                  </span>
                  <span className="theme-heading mt-0.5 block truncate font-heading text-lg font-semibold">{entry.episodeTitle}</span>
                  <span className="theme-meta mt-0.5 block text-xs">Saved {timeAgo(entry.bookmarkedAt)}</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void remove(entry)}
                disabled={pending === entry.episodeId}
                aria-label={`Remove ${entry.episodeTitle} from your bookmarks`}
                className="flex w-11 shrink-0 items-center justify-center rounded-r-[20px] text-[var(--text-secondary)] transition hover:bg-[var(--panel-hover)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
      {cursor ? (
        <div className="mt-4 text-center">
          <button type="button" onClick={() => void loadMore()} disabled={pending === "more"} className="story-button-secondary min-h-11 disabled:opacity-60">
            {pending === "more" ? "Loading…" : "Show more"}
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
