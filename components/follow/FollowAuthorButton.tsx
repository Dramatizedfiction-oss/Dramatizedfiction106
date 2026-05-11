"use client";

import { useEffect, useMemo, useState } from "react";

const storageKey = "df-followed-authors";

function readFollowedAuthors() {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [] as string[];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [] as string[];
  }
}

export default function FollowAuthorButton({
  authorId,
  authorName,
}: {
  authorId: string;
  authorName: string;
}) {
  const [followedAuthors, setFollowedAuthors] = useState<string[]>([]);

  useEffect(() => {
    setFollowedAuthors(readFollowedAuthors());
  }, []);

  const isFollowing = useMemo(
    () => followedAuthors.includes(authorId),
    [authorId, followedAuthors],
  );

  function toggleFollow() {
    const next = isFollowing
      ? followedAuthors.filter((id) => id !== authorId)
      : [...followedAuthors, authorId];

    setFollowedAuthors(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  return (
    <button
      type="button"
      onClick={toggleFollow}
      className={isFollowing ? "story-button-secondary" : "story-button-primary"}
      aria-label={`${isFollowing ? "Unfollow" : "Follow"} ${authorName}`}
    >
      {isFollowing ? "Following" : "Follow Author"}
    </button>
  );
}
