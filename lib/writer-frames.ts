// Client-safe. Avatar frames.
//
// Writer-level frames are worked out from the stored writer level
// (User.writerStatus) every time they are shown; never stored. Readers have
// none. Board and CEO are framed by their writer level like any writer.
//
// Store frames (Sweep I): a member may wear a Store frame instead
// (User.selectedFrameId) or choose no frame (User.hideLevelFrame). The level
// frame always stays available to the writer who earned it. `displayedFrame`
// is the one place that decides what shows.

import { hasRoleAccess } from "@/lib/roles";
import { writerStatusLabel } from "@/lib/writer-studio/status";

export type FrameTier = "ink" | "quill" | "gilded" | "laureate";

/** Lowest to highest. (The silver "Folio" design is kept in reserve for a future level.) */
export const FRAME_BY_LEVEL: Record<string, FrameTier> = {
  BEGINNER: "ink",
  FULL: "quill",
  FEATURED: "gilded",
  ELITE: "laureate",
};

export const FRAME_NAMES: Record<FrameTier, string> = {
  ink: "Ink",
  quill: "Quill",
  gilded: "Gilded",
  laureate: "Laureate",
};

export type FramedUser = { role?: string | null; writerStatus?: string | null };

/** The level frame for a member, or null (readers, or no role known). */
export function frameFor(user: FramedUser): { tier: FrameTier; label: string } | null {
  if (!hasRoleAccess(user.role, "WRITER")) return null;
  const level = user.writerStatus && FRAME_BY_LEVEL[user.writerStatus] ? user.writerStatus : "BEGINNER";
  return { tier: FRAME_BY_LEVEL[level], label: writerStatusLabel(level) };
}

/** The Store frame as loaded with a member (FRAME_USER_SELECT). */
export type SelectedFrame = { imageUrl: string; name: string; active: boolean; category: string };

export type FrameUser = FramedUser & { hideLevelFrame?: boolean | null; selectedFrame?: SelectedFrame | null };

export type DisplayedFrame =
  | { kind: "level"; tier: FrameTier; label: string }
  | { kind: "store"; imageUrl: string; name: string };

/**
 * What frame shows around a member's avatar: an active Store frame they chose,
 * else their level frame unless they chose "No frame", else nothing. A hidden
 * Store frame isn't shown (they fall back) until it's shown again. Callers
 * that don't load the Store fields get the level frame, as before Sweep I.
 */
export function displayedFrame(user: FrameUser): DisplayedFrame | null {
  const store = user.selectedFrame;
  if (store && store.active && store.category === "FRAME") return { kind: "store", imageUrl: store.imageUrl, name: store.name };
  if (user.hideLevelFrame) return null;
  const level = frameFor(user);
  return level ? { kind: "level", ...level } : null;
}

/** Add to a Prisma `select` on User wherever FramedAvatar shows that member. */
export const FRAME_USER_SELECT = {
  writerStatus: true,
  hideLevelFrame: true,
  selectedFrame: { select: { imageUrl: true, name: true, active: true, category: true } },
} as const;
