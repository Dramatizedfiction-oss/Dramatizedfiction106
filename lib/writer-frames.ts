// Client-safe. Avatar frames for writers, worked out from the stored writer
// level (User.writerStatus) every time they are shown; never stored, never
// chosen by the member. Readers get no frame. Board and CEO are framed by
// their writer level like any writer.

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

/** The frame for a member, or null (readers, or no role known). */
export function frameFor(user: FramedUser): { tier: FrameTier; label: string } | null {
  if (!hasRoleAccess(user.role, "WRITER")) return null;
  const level = user.writerStatus && FRAME_BY_LEVEL[user.writerStatus] ? user.writerStatus : "BEGINNER";
  return { tier: FRAME_BY_LEVEL[level], label: writerStatusLabel(level) };
}
