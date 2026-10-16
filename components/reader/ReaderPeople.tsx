"use client";

import { useEffect } from "react";
import FramedAvatar from "@/components/avatar/FramedAvatar";
import { EmptyShelf, ShelfError, ShelfRow } from "@/components/reader/ShelfParts";
import { send, useUndoableRemove } from "@/components/reader/useUndoableRemove";
import type { PersonEntry } from "@/lib/author-follows";
import { timeAgo } from "@/lib/engagement-rules";
import { profileHref } from "@/lib/profile-links";
import { writerStatusLabel } from "@/lib/writer-studio/status";

/**
 * Library › People: the writers the member follows (Sweep B2), with Unfollow +
 * Undo. Only ever rendered on the member's own reading profile.
 */
export default function ReaderPeople({
  initial,
  onCountChange,
}: {
  initial: PersonEntry[];
  onCountChange?: (count: number) => void;
}) {
  const list = useUndoableRemove({
    initial,
    keyOf: (person) => person.id,
    remove: (person) => send(`/api/me/author-follows/${encodeURIComponent(person.id)}`, "DELETE"),
    restore: (person) => send(`/api/me/author-follows/${encodeURIComponent(person.id)}`, "PUT"),
    failMessage: "Couldn't update who you follow. Please try again.",
  });

  useEffect(() => {
    onCountChange?.(list.liveCount);
  }, [list.liveCount, onCountChange]);

  if (list.items.length === 0) {
    return (
      <EmptyShelf
        eyebrow="People"
        title="No writers followed yet"
        body={
          <>
            Open a writer&apos;s profile and tap <span className="font-semibold text-[var(--text-primary)]">Follow</span>. They&apos;ll appear here.
          </>
        }
      />
    );
  }

  return (
    <div>
      <h2 className="sr-only">Writers you follow</h2>
      <p className="theme-meta text-sm">
        {list.liveCount} {list.liveCount === 1 ? "writer" : "writers"} you follow
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.items.map((person) => {
          const name = person.name?.trim() || "Writer";
          return (
            <ShelfRow
              key={person.id}
              href={profileHref(person)}
              removeLabel={`Unfollow ${name}`}
              onRemove={() => list.removeItem(person)}
              removed={list.removed.has(person.id)}
              removedText={`Unfollowed ${name}`}
              onUndo={() => list.undo(person)}
            >
              <FramedAvatar user={person} size="lg" />
              <span className="min-w-0 flex-1">
                <span className="theme-heading block truncate font-heading text-lg font-semibold">{name}</span>
                <span className="theme-meta mt-0.5 block truncate font-mono-df text-[10px] uppercase tracking-[0.18em]">
                  {writerStatusLabel(person.writerStatus)}
                </span>
                <span className="theme-meta mt-0.5 block text-xs">Followed {timeAgo(person.followedAt)}</span>
              </span>
            </ShelfRow>
          );
        })}
      </ul>
      <ShelfError message={list.error} />
    </div>
  );
}
