"use client";

import Link from "next/link";
import { useState } from "react";
import type { ActivityItem } from "@/lib/activity";
import { timeAgo } from "@/lib/engagement-rules";

/**
 * A member's Activity: bookmarks, ratings and comments, newest first, with
 * "Show more". Shown on the member's own /reader, and on /reader/[id] when
 * they made it public. `visitor` switches the wording.
 */
export default function ReaderActivity({
  readerId,
  initial,
  visitor = false,
}: {
  readerId: string;
  initial: { items: ActivityItem[]; nextCursor: string | null };
  visitor?: boolean;
}) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/readers/${encodeURIComponent(readerId)}/activity?before=${encodeURIComponent(cursor)}`);
      const data = (await response.json().catch(() => null)) as { items?: ActivityItem[]; nextCursor?: string | null } | null;
      if (!response.ok || !data?.items) throw new Error();
      const seen = new Set(items.map((item) => item.key));
      setItems((current) => [...current, ...data.items!.filter((item) => !seen.has(item.key))]);
      setCursor(data.nextCursor ?? null);
    } catch {
      setError("Couldn't load more activity. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="theme-panel rounded-[24px] border border-dashed border-[var(--border-color)] px-5 py-10 text-center sm:px-8 sm:py-14">
        <p className="eyebrow">Activity</p>
        <h2 className="font-heading theme-heading mt-2 text-balance text-2xl font-semibold">No activity yet</h2>
        <p className="theme-meta mx-auto mt-3 max-w-md text-sm leading-6">
          {visitor
            ? "This reader hasn't bookmarked, rated or commented on anything yet."
            : "Bookmarks, ratings and comments you make on episodes will show up here."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="sr-only">Activity</h2>
      <ul className="divide-y divide-[var(--border-color)] overflow-hidden rounded-[20px] border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        {items.map((item) => (
          <li key={item.key}>
            <Link href={`/episode/${item.episode.id}`} className="theme-panel-hover flex gap-3 px-4 py-3.5 transition">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                <KindIcon kind={item.kind} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="theme-body block text-sm leading-6">
                  {item.kind === "bookmark" ? "Bookmarked " : item.kind === "rating" ? "Rated " : "Commented on "}
                  <span className="font-semibold text-[var(--text-primary)]">{item.episode.title}</span>
                  {item.kind === "rating" ? (
                    <span className="whitespace-nowrap">
                      {" "}
                      <span aria-hidden className="text-[var(--status-warning)]">
                        {"★".repeat(item.value)}
                      </span>
                      <span className="sr-only">{item.value} out of 5 stars</span>
                    </span>
                  ) : null}
                </span>
                <span className="theme-meta block truncate text-xs">
                  {item.episode.seriesTitle} · Ep {item.episode.episodeNumber} · <time dateTime={item.at}>{timeAgo(item.at)}</time>
                </span>
                {item.kind === "comment" ? (
                  <span className="theme-meta mt-1 line-clamp-3 block whitespace-pre-line break-words text-sm leading-6">{item.body}</span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {cursor ? (
        <div className="mt-4 text-center">
          <button type="button" onClick={() => void loadMore()} disabled={loading} className="story-button-secondary min-h-11 disabled:opacity-60">
            {loading ? "Loading…" : "Show more"}
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

function KindIcon({ kind }: { kind: ActivityItem["kind"] }) {
  const common = { "aria-hidden": true, viewBox: "0 0 24 24", className: "h-4 w-4", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (kind === "bookmark") {
    return (
      <svg {...common} fill="none">
        <path d="M6 4h12v16l-6-4-6 4z" />
      </svg>
    );
  }
  if (kind === "rating") {
    return (
      <svg {...common} fill="none">
        <path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z" />
      </svg>
    );
  }
  return (
    <svg {...common} fill="none">
      <path d="M5 5h14v10H9l-4 4z" />
    </svg>
  );
}
