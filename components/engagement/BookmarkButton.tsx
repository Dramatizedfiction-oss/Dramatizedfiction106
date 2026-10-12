"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";

/*
 * Bookmark an episode (it goes into the member's Bookmarks list; it is not a
 * reading position). The episode reader shows two buttons, one in the top bar
 * and one at the end of the story, sharing one state through BookmarkProvider.
 * Optimistic: flips immediately, reverts if the request fails. Signed-out
 * readers are sent to sign in and brought back to the episode.
 */

type BookmarkState = {
  bookmarked: boolean;
  pending: boolean;
  error: string | null;
  toggle: () => void;
};

const BookmarkContext = createContext<BookmarkState | null>(null);

export function BookmarkProvider({
  episodeId,
  initialBookmarked,
  signedIn,
  children,
}: {
  episodeId: string;
  initialBookmarked: boolean;
  signedIn: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const signInHref = `/sign-in?callbackUrl=${encodeURIComponent(`/episode/${episodeId}`)}`;

  async function toggle() {
    if (!signedIn) {
      router.push(signInHref);
      return;
    }
    if (pending) return;

    const next = !bookmarked;
    setBookmarked(next);
    setError(null);
    setPending(true);
    try {
      const response = await fetch(`/api/me/bookmarks/${encodeURIComponent(episodeId)}`, { method: next ? "PUT" : "DELETE" });
      if (response.status === 401) {
        router.push(signInHref);
        return;
      }
      const data = (await response.json().catch(() => null)) as { bookmarked?: boolean; error?: string } | null;
      if (!response.ok || typeof data?.bookmarked !== "boolean") throw new Error(data?.error || "Couldn't update. Please try again.");
      setBookmarked(data.bookmarked);
    } catch (caught) {
      setBookmarked(!next);
      setError(caught instanceof Error ? caught.message : "Couldn't update. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <BookmarkContext.Provider value={{ bookmarked, pending, error, toggle: () => void toggle() }}>
      {children}
    </BookmarkContext.Provider>
  );
}

function useBookmark() {
  const state = useContext(BookmarkContext);
  if (!state) throw new Error("BookmarkButton must be inside BookmarkProvider.");
  return state;
}

/** `icon`: the reader's top bar. `pill`: labeled, at the end of the episode (shows errors). */
export default function BookmarkButton({ variant, episodeTitle }: { variant: "icon" | "pill"; episodeTitle: string }) {
  const { bookmarked, pending, error, toggle } = useBookmark();
  const label = bookmarked ? `Remove ${episodeTitle} from your bookmarks` : `Bookmark ${episodeTitle}`;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={bookmarked}
        aria-label={label}
        title={bookmarked ? "Bookmarked" : "Bookmark"}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-[var(--panel-hover)] ${
          bookmarked ? "text-[var(--accent)]" : "text-[var(--paper-muted)] hover:text-[var(--paper-ink)]"
        }`}
      >
        <BookmarkGlyph filled={bookmarked} />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={bookmarked}
        aria-label={label}
        disabled={pending}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition disabled:cursor-wait ${
          bookmarked
            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
            : "border-[var(--paper-rule)] text-[var(--paper-ink)] hover:border-[var(--paper-muted)]"
        }`}
      >
        <BookmarkGlyph filled={bookmarked} />
        {bookmarked ? "Saved to Bookmarks" : "Bookmark"}
      </button>
      <p className="sr-only" aria-live="polite">
        {bookmarked ? "Saved to your bookmarks." : ""}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function BookmarkGlyph({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 4h12v16l-6-4-6 4z" />
    </svg>
  );
}
