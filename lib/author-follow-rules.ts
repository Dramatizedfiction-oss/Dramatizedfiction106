// Client-safe rules for following writers (Sweep B2). Pure functions only;
// lib/author-follows.ts applies them on the server.
//
// A follow belongs to the follower's reading profile (Library > People). A
// writer's public profile shows who follows them (only members who chose to be
// listed, followerListVisibility PUBLIC; the count includes everyone) and never
// who the writer follows.

import { isWriterRole } from "@/lib/profile-links";

/** Followers shown on the writer's profile before "See all". */
export const FOLLOWERS_PREVIEW_COUNT = 8;
/** Followers per page on /author/[id]/followers. */
export const FOLLOWERS_PAGE_SIZE = 30;

/** The old device-only list of followed writers (localStorage), imported once after sign-in. */
export const DEVICE_FOLLOWS_KEY = "df-followed-authors";
/** At most this many ids are taken from a device import. */
export const DEVICE_IMPORT_MAX = 50;

export type FollowCheck = { ok: true } | { ok: false; status: 400 | 404; code: "SELF" | "NOT_FOUND"; message: string };

/** Whether `followerId` may follow `author` (null when no such member). */
export function checkCanFollow(followerId: string, author: { id: string; role: string | null } | null): FollowCheck {
  if (author && author.id === followerId) {
    return { ok: false, status: 400, code: "SELF", message: "You can't follow yourself." };
  }
  if (!author || !isWriterRole(author.role)) {
    return { ok: false, status: 404, code: "NOT_FOUND", message: "That writer isn't available to follow." };
  }
  return { ok: true };
}

function isUsableId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 191;
}

/** The ids from a device import: strings only, no repeats, at most DEVICE_IMPORT_MAX. */
export function parseDeviceFollowIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids: string[] = [];
  for (const item of value) {
    if (isUsableId(item) && !ids.includes(item)) ids.push(item);
    if (ids.length >= DEVICE_IMPORT_MAX) break;
  }
  return ids;
}

export function followerCountText(count: number) {
  return `${count.toLocaleString("en-US")} ${count === 1 ? "follower" : "followers"}`;
}
