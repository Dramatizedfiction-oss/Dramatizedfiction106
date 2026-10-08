import type { AiUsageTag } from "@/lib/ai-usage";

/*
 * Per-device backup of unsaved editor work (localStorage). It is a safety
 * net, never the source of truth: on load the server version wins unless the
 * backup was made on top of that exact server version (see resolveBackup).
 * Every storage access is wrapped: private windows and blocked storage just
 * mean no backup.
 */

export type EpisodeDraftFields = {
  title: string;
  bodyHtml: string;
  description: string;
  contentWarning: string;
  coverImage: string;
  aiUsageTag: AiUsageTag;
};

export type EpisodeBackup = EpisodeDraftFields & {
  v: 1;
  episodeId: string;
  /** Local time the backup was written (ms). */
  writtenAt: number;
  /** The server lastSavedAt the edits were made on top of. */
  baseLastSavedAt: string;
};

const backupKey = (episodeId: string) => `df:studio:episode:${episodeId}`;
// Written by the previous Writer Studio editor (body HTML only, no version).
const legacyKey = (episodeId: string) => `writer-draft-${episodeId}`;

export function readBackup(episodeId: string): EpisodeBackup | null {
  try {
    const raw = window.localStorage.getItem(backupKey(episodeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EpisodeBackup>;
    if (parsed?.v !== 1 || parsed.episodeId !== episodeId || typeof parsed.bodyHtml !== "string") return null;
    return parsed as EpisodeBackup;
  } catch {
    return null;
  }
}

export function readLegacyBackup(episodeId: string): string | null {
  try {
    return window.localStorage.getItem(legacyKey(episodeId));
  } catch {
    return null;
  }
}

export function writeBackup(backup: EpisodeBackup) {
  try {
    window.localStorage.setItem(backupKey(backup.episodeId), JSON.stringify(backup));
  } catch {
    // Storage full or unavailable: the server save still runs.
  }
}

export function clearBackup(episodeId: string) {
  try {
    window.localStorage.removeItem(backupKey(episodeId));
    window.localStorage.removeItem(legacyKey(episodeId));
  } catch {
    // ignore
  }
}

export function sameDraft(a: EpisodeDraftFields, b: EpisodeDraftFields) {
  return (
    a.title.trim() === b.title.trim() &&
    a.bodyHtml === b.bodyHtml &&
    a.description === b.description &&
    a.contentWarning === b.contentWarning &&
    a.coverImage === b.coverImage &&
    a.aiUsageTag === b.aiUsageTag
  );
}

export type BackupResolution =
  | { action: "none" }
  /** Unsaved edits made on top of the current server version (e.g. the tab crashed): restore them. */
  | { action: "restore"; backup: EpisodeDraftFields; writtenAt: number }
  /** The server changed since (or the copy is from the old editor): ask, never overwrite. */
  | { action: "offer"; backup: EpisodeDraftFields; writtenAt: number | null; reason: "server-newer" | "legacy" };

export function resolveBackup(
  server: EpisodeDraftFields & { lastSavedAt: string },
  backup: EpisodeBackup | null,
  legacyBodyHtml: string | null,
): BackupResolution {
  if (backup && !sameDraft(backup, server)) {
    if (backup.baseLastSavedAt === server.lastSavedAt) {
      return { action: "restore", backup, writtenAt: backup.writtenAt };
    }
    return { action: "offer", backup, writtenAt: backup.writtenAt, reason: "server-newer" };
  }

  if (!backup && legacyBodyHtml && legacyBodyHtml !== server.bodyHtml) {
    return { action: "offer", backup: { ...server, bodyHtml: legacyBodyHtml }, writtenAt: null, reason: "legacy" };
  }

  return { action: "none" };
}
