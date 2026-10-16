"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import UndoToast from "@/components/follow/UndoToast";
import { followerCountText } from "@/lib/author-follow-rules";

/*
 * Follow / unfollow a WRITER from their profile (Sweep B2). Stored on the
 * visitor's account (AuthorFollow) and listed in the visitor's own reading
 * profile, Library > People; never on any writer profile. Works the same for
 * readers and for writers viewing another writer. The profile's owner never
 * gets this button; with `preview` (the owner's "see as visitor" view) it is
 * shown disabled so the layout matches.
 *
 * Optimistic like FollowSeriesButton: flips at once, reverts on failure, shows
 * "Following" when followed, and unfollowing offers Undo for 6 s. Signed-out
 * visitors are sent to sign in and brought back to `returnPath`.
 */
export default function FollowAuthorButton({
  authorId,
  authorName,
  initialFollowing = false,
  initialCount,
  signedIn = false,
  returnPath,
  preview = false,
}: {
  authorId: string;
  authorName: string;
  initialFollowing?: boolean;
  initialCount: number;
  signedIn?: boolean;
  returnPath: string;
  preview?: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState(false);
  const queued = useRef<boolean | null>(null);

  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(() => setUndo(false), 6000);
    return () => window.clearTimeout(timer);
  }, [undo]);

  const signInHref = `/sign-in?callbackUrl=${encodeURIComponent(returnPath)}`;

  async function apply(next: boolean) {
    if (preview) return;
    if (!signedIn) {
      router.push(signInHref);
      return;
    }
    if (pending) {
      queued.current = next;
      setFollowing(next);
      setUndo(!next);
      return;
    }

    const previousCount = count;
    setFollowing(next);
    setCount((value) => Math.max(0, value + (next ? 1 : -1)));
    setError(null);
    setUndo(!next);
    setPending(true);

    try {
      const response = await fetch(`/api/me/author-follows/${encodeURIComponent(authorId)}`, {
        method: next ? "PUT" : "DELETE",
      });
      if (response.status === 401) {
        router.push(signInHref);
        return;
      }
      const data = (await response.json().catch(() => null)) as
        | { following?: boolean; followerCount?: number; error?: string }
        | null;
      if (!response.ok || typeof data?.following !== "boolean") {
        throw new Error(data?.error || "Couldn't update. Please try again.");
      }
      if (queued.current === null) {
        setFollowing(data.following);
        if (typeof data.followerCount === "number") setCount(data.followerCount);
      }
    } catch (caught) {
      setFollowing(!next);
      setCount(previousCount);
      setUndo(false);
      setError(caught instanceof Error ? caught.message : "Couldn't update. Please try again.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (pending || queued.current === null) return;
    const next = queued.current;
    queued.current = null;
    void apply(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        onClick={() => void apply(!following)}
        disabled={preview}
        aria-pressed={signedIn && !preview ? following : undefined}
        aria-label={preview ? "Follow (visitors see this button)" : `${following ? "Unfollow" : "Follow"} ${authorName}`}
        className={`${following ? "story-button-secondary" : "story-button-primary"} min-h-11 gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {following ? (
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 10.5l3.5 3.5 7.5-8" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
            <path d="M10 4v12M4 10h12" />
          </svg>
        )}
        <span>{following ? "Following" : "Follow"}</span>
      </button>
      <span className="theme-meta text-sm" aria-live="polite">
        {count > 0 ? followerCountText(count) : ""}
      </span>
      {error ? (
        <p role="alert" className="w-full text-sm text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}
      <UndoToast
        message={undo ? `Unfollowed ${authorName}` : null}
        onUndo={() => {
          setUndo(false);
          void apply(true);
        }}
      />
    </div>
  );
}
