"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/*
 * Follow / unfollow a SERIES (it goes into the member's Library). Optimistic:
 * the state and count flip immediately and revert if the request fails.
 * Signed-out visitors are sent to sign in and brought back to this series.
 * Following an author is a separate control on the author's page.
 */
export default function FollowSeriesButton({
  seriesId,
  seriesTitle,
  initialFollowing,
  initialCount,
  signedIn,
}: {
  seriesId: string;
  seriesTitle: string;
  initialFollowing: boolean;
  initialCount: number;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInHref = `/sign-in?callbackUrl=${encodeURIComponent(`/series/${seriesId}`)}`;

  async function toggle() {
    if (!signedIn) {
      router.push(signInHref);
      return;
    }
    if (pending) return;

    const next = !following;
    const previous = { following, count };
    setFollowing(next);
    setCount((value) => Math.max(0, value + (next ? 1 : -1)));
    setError(null);
    setPending(true);

    try {
      const response = await fetch(`/api/me/follows/${encodeURIComponent(seriesId)}`, {
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
      // The server's numbers are the truth (someone else may have followed meanwhile).
      setFollowing(data.following);
      if (typeof data.followerCount === "number") setCount(data.followerCount);
    } catch (caught) {
      setFollowing(previous.following);
      setCount(previous.count);
      setError(caught instanceof Error ? caught.message : "Couldn't update. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-pressed={signedIn ? following : undefined}
        aria-label={`${following ? "Unfollow" : "Follow"} the series ${seriesTitle}`}
        className={`${following ? "story-button-secondary" : "story-button-primary"} min-h-11 gap-2`}
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
        {following ? "Following" : "Follow Series"}
      </button>
      <span className="theme-meta text-sm" aria-live="polite">
        {count.toLocaleString()} {count === 1 ? "follower" : "followers"}
      </span>
      {error ? (
        <p role="alert" className="w-full text-sm text-[var(--status-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
