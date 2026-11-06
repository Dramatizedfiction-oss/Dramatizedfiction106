import { episodeBlocks } from "@/lib/comments";
import { screenCommentText } from "@/lib/comment-moderation";
import { PUBLIC_EPISODE_WHERE } from "@/lib/content-visibility";
import { failure, findPublicEpisode, isUsableId, type EngagementFailure } from "@/lib/engagement";
import { normalizeCommentBody } from "@/lib/engagement-rules";
import { prisma } from "@/lib/prisma";
import { takeRateLimit } from "@/lib/rate-limit";
import { HIGHLIGHT_RATE_LIMITS } from "@/lib/rate-limit-rules";
import { shortEpisodeLabel } from "@/lib/season-rules";
import { parseAnchor, resolveAnchor } from "@/lib/text-anchor";

/*
 * Saved highlights (Sweep I): a passage a member keeps, with an optional
 * private note. Only ever the member's own: every query is scoped to the
 * session's user id, and someone else's highlight looks the same as a
 * missing one (404). Shown in Library › Highlights, separate from episode
 * Bookmarks. Deleting the episode, series or account cascades them.
 */

export const HIGHLIGHT_NOTE_MAX = 1000;
export const HIGHLIGHT_PAGE_SIZE = 20;
export const MAX_HIGHLIGHTS_PER_EPISODE = 200;

export type HighlightEntry = {
  id: string;
  quote: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  episodeId: string;
  episodeTitle: string;
  episodeNumber: number;
  episodeLabel: string;
  seriesId: string;
  seriesTitle: string;
  themeColor: string | null;
};

type NoteCheck = { ok: true; note: string | null } | { ok: false; message: string };

/** Plain text like comments; blank means no note. */
export function checkNote(value: unknown): NoteCheck {
  if (value === undefined || value === null) return { ok: true, note: null };
  if (typeof value !== "string") return { ok: false, message: "Notes are plain text." };
  const note = normalizeCommentBody(value);
  if (note.length > HIGHLIGHT_NOTE_MAX) return { ok: false, message: `Notes can be up to ${HIGHLIGHT_NOTE_MAX.toLocaleString()} characters.` };
  return { ok: true, note: note || null };
}

const entrySelect = {
  id: true,
  quote: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  episode: {
    select: {
      id: true,
      title: true,
      episodeNumber: true,
      seasonEpisodeNumber: true,
      season: { select: { number: true } },
      series: { select: { id: true, title: true, themeColor: true } },
    },
  },
} as const;

type Row = {
  id: string;
  quote: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  episode: {
    id: string;
    title: string;
    episodeNumber: number;
    seasonEpisodeNumber: number | null;
    season: { number: number } | null;
    series: { id: string; title: string; themeColor: string | null };
  };
};

function toEntry(row: Row): HighlightEntry {
  return {
    id: row.id,
    quote: row.quote,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    episodeId: row.episode.id,
    episodeTitle: row.episode.title,
    episodeNumber: row.episode.episodeNumber,
    episodeLabel: shortEpisodeLabel(row.episode),
    seriesId: row.episode.series.id,
    seriesTitle: row.episode.series.title,
    themeColor: row.episode.series.themeColor,
  };
}

/** The member's highlights on readable episodes, newest first. `before` is the last id of the previous page. */
export async function listHighlights(userId: string, before?: string | null) {
  const where = { userId, episode: PUBLIC_EPISODE_WHERE };
  const cursor = isUsableId(before) ? await prisma.highlight.findFirst({ where: { id: before, userId }, select: { id: true } }) : null;
  const rows = await prisma.highlight.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: HIGHLIGHT_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor.id }, skip: 1 } : {}),
    select: entrySelect,
  });
  const page = rows.slice(0, HIGHLIGHT_PAGE_SIZE).map(toEntry);
  return { highlights: page, nextCursor: rows.length > HIGHLIGHT_PAGE_SIZE ? page[page.length - 1].id : null };
}

export function countHighlights(userId: string) {
  return prisma.highlight.count({ where: { userId, episode: PUBLIC_EPISODE_WHERE } });
}

type SaveResult = { ok: true; highlight: HighlightEntry } | EngagementFailure;

export async function createHighlight(userId: string, input: { episodeId: unknown; passage: unknown; note?: unknown }): Promise<SaveResult> {
  const anchor = parseAnchor(input.passage);
  if (!anchor.ok) return failure(400, "BAD_REQUEST", anchor.message);
  const note = checkNote(input.note);
  if (!note.ok) return failure(400, "BAD_REQUEST", note.message);
  if (note.note) {
    const screened = await screenCommentText(note.note);
    if (!screened.ok) return failure(400, "BAD_REQUEST", screened.message);
  }

  const episode = await findPublicEpisode(input.episodeId);
  if (!episode) return failure(404, "NOT_FOUND", "That episode isn't available.");
  if (episode.locked) return failure(403, "LOCKED", "This episode can't be read right now.");
  if (!resolveAnchor(await episodeBlocks(episode.id), anchor.anchor)) {
    return failure(409, "PASSAGE_CHANGED", "That passage isn't in the episode any more. Reload and try again.");
  }
  const existing = await prisma.highlight.count({ where: { userId, episodeId: episode.id } });
  if (existing >= MAX_HIGHLIGHTS_PER_EPISODE) {
    return failure(409, "LIMIT", `You can save up to ${MAX_HIGHLIGHTS_PER_EPISODE} highlights in one episode.`);
  }
  if (!(await takeRateLimit(userId, "HIGHLIGHT", HIGHLIGHT_RATE_LIMITS))) {
    return failure(429, "RATE_LIMITED", "You're saving highlights very quickly. Wait a moment, then try again.");
  }

  const created = await prisma.highlight.create({
    data: { userId, episodeId: episode.id, quote: anchor.anchor.quote, quotePrefix: anchor.anchor.prefix, quoteSuffix: anchor.anchor.suffix, note: note.note },
    select: entrySelect,
  });
  return { ok: true, highlight: toEntry(created) };
}

export async function updateHighlightNote(userId: string, id: unknown, rawNote: unknown): Promise<SaveResult> {
  if (!isUsableId(id)) return failure(404, "NOT_FOUND", "Highlight not found.");
  const note = checkNote(rawNote);
  if (!note.ok) return failure(400, "BAD_REQUEST", note.message);
  if (note.note) {
    const screened = await screenCommentText(note.note);
    if (!screened.ok) return failure(400, "BAD_REQUEST", screened.message);
  }
  const owned = await prisma.highlight.findFirst({ where: { id, userId }, select: { id: true } });
  if (!owned) return failure(404, "NOT_FOUND", "Highlight not found.");
  const updated = await prisma.highlight.update({ where: { id: owned.id }, data: { note: note.note }, select: entrySelect });
  return { ok: true, highlight: toEntry(updated) };
}

export async function deleteHighlight(userId: string, id: unknown) {
  if (!isUsableId(id)) return false;
  const { count } = await prisma.highlight.deleteMany({ where: { id, userId } });
  return count > 0;
}

/** One of the member's own highlights with its anchor, for jumping to it in the reader. */
export function findOwnHighlight(userId: string, id: unknown, episodeId: string) {
  if (!isUsableId(id)) return Promise.resolve(null);
  return prisma.highlight.findFirst({
    where: { id, userId, episodeId },
    select: { id: true, quote: true, quotePrefix: true, quoteSuffix: true, note: true },
  });
}
