import { FRAME_USER_SELECT, type SelectedFrame } from "@/lib/writer-frames";
import { ERROR_COPY } from "@/lib/error-copy";
import type { Prisma } from "@prisma/client";
import { AUDIT, recordAudit } from "@/lib/admin/audit";
import { PUBLIC_EPISODE_WHERE } from "@/lib/content-visibility";
import {
  COMMENT_DUPLICATE_WINDOW_MS,
  COMMENT_PAGE_SIZE,
  COMMENT_RATE_LIMITS,
  checkCommentBody,
  commentRateLimited,
} from "@/lib/engagement-rules";
import { failure, findPublicEpisode, isUsableId, type EngagementFailure } from "@/lib/engagement";
import { screenCommentText } from "@/lib/comment-moderation";
import { parseEpisodeHtml } from "@/lib/episode-content";
import { prisma } from "@/lib/prisma";
import { takeRateLimit } from "@/lib/rate-limit";
import { EDIT_RATE_LIMITS } from "@/lib/rate-limit-rules";
import { parseAnchor, resolveAnchor, textBlocks, type PassageAnchor } from "@/lib/text-anchor";
import { hasRoleAccess, type AppRole } from "@/lib/roles";

/*
 * Flat, plain-text comments on episodes. Anyone may read the comments of a
 * published episode; signed-in members post. A comment's author edits or
 * deletes it (deleted outright); the series author and Board/CEO remove it
 * (hidden via removedAt and kept for its reports). Removed comments never
 * appear anywhere public.
 */

export type CommentView = {
  id: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  author: { id: string; name: string | null; image: string | null; role: string; writerStatus: string; hideLevelFrame: boolean; selectedFrame: SelectedFrame | null };
  /** Sweep I: the passage this comment is about, and whether it's still in the episode. */
  passage: (PassageAnchor & { found: boolean }) | null;
};

const VISIBLE = { removedAt: null } satisfies Prisma.CommentWhereInput;

const commentSelect = {
  id: true,
  body: true,
  createdAt: true,
  editedAt: true,
  quote: true,
  quotePrefix: true,
  quoteSuffix: true,
  // writerStatus picks the writer's avatar ring.
  user: { select: { id: true, name: true, image: true, role: true, ...FRAME_USER_SELECT } },
} satisfies Prisma.CommentSelect;

type CommentRow = Prisma.CommentGetPayload<{ select: typeof commentSelect }>;

function toView(row: CommentRow, blocks: readonly string[] | null = null): CommentView {
  const anchor = row.quote ? { quote: row.quote, prefix: row.quotePrefix ?? "", suffix: row.quoteSuffix ?? "" } : null;
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    author: row.user,
    passage: anchor ? { ...anchor, found: blocks ? resolveAnchor(blocks, anchor) !== null : true } : null,
  };
}

/** An episode's text blocks (lib/text-anchor.ts), for finding passages. */
export async function episodeBlocks(episodeId: string) {
  const episode = await prisma.episode.findUnique({ where: { id: episodeId }, select: { body: true } });
  return episode ? textBlocks(parseEpisodeHtml(episode.body)) : [];
}

/**
 * One page of an episode's visible comments, newest first. `cursor` is the id
 * of the last comment of the previous page. Null when the episode isn't public.
 */
export async function listComments(episodeId: string, cursor?: string | null) {
  const episode = await findPublicEpisode(episodeId);
  if (!episode) return null;

  const validCursor =
    isUsableId(cursor) &&
    (await prisma.comment.findFirst({ where: { id: cursor, episodeId: episode.id, ...VISIBLE }, select: { id: true } }));

  const [rows, total] = await Promise.all([
    prisma.comment.findMany({
      where: { episodeId: episode.id, ...VISIBLE },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: COMMENT_PAGE_SIZE + 1,
      ...(validCursor ? { cursor: { id: validCursor.id }, skip: 1 } : {}),
      select: commentSelect,
    }),
    prisma.comment.count({ where: { episodeId: episode.id, ...VISIBLE } }),
  ]);

  const shown = rows.slice(0, COMMENT_PAGE_SIZE);
  // Only when a comment quotes a passage: is it still in the episode?
  const blocks = shown.some((row) => row.quote) ? await episodeBlocks(episode.id) : null;
  const page = shown.map((row) => toView(row, blocks));
  return { comments: page, total, nextCursor: rows.length > COMMENT_PAGE_SIZE ? page[page.length - 1].id : null };
}

type PostResult = { ok: true; comment: CommentView; created: boolean } | EngagementFailure;

export async function postComment(
  userId: string,
  episodeId: unknown,
  rawBody: unknown,
  now = new Date(),
  /** Sweep I: a passage anchor ({ quote, prefix, suffix }) for a comment on a passage. */
  rawPassage?: unknown,
): Promise<PostResult> {
  const check = checkCommentBody(rawBody);
  if (!check.ok) return failure(400, "BAD_REQUEST", check.message);
  const screened = await screenCommentText(check.body);
  if (!screened.ok) return failure(400, "BAD_REQUEST", screened.message);

  let passage: PassageAnchor | null = null;
  if (rawPassage !== undefined && rawPassage !== null) {
    const parsed = parseAnchor(rawPassage);
    if (!parsed.ok) return failure(400, "BAD_REQUEST", parsed.message);
    passage = parsed.anchor;
  }

  const episode = await findPublicEpisode(episodeId);
  if (!episode) return failure(404, "NOT_FOUND", "That episode isn't available.");
  if (episode.locked) return failure(403, "LOCKED", "This episode can't be read right now, so comments are closed.");
  // A passage must really be in the episode now.
  if (passage && !resolveAnchor(await episodeBlocks(episode.id), passage)) {
    return failure(409, "PASSAGE_CHANGED", "That passage isn't in the episode any more. Reload and try again.");
  }

  const longestWindow = Math.max(...COMMENT_RATE_LIMITS.map((limit) => limit.windowMs));
  const recent = await prisma.comment.findMany({
    where: { userId, createdAt: { gte: new Date(now.getTime() - longestWindow) } },
    orderBy: { createdAt: "desc" },
    select: { id: true, episodeId: true, body: true, quote: true, createdAt: true, removedAt: true },
  });

  // A double tap (same text, same episode, moments apart) returns the comment already posted.
  const repeat = recent.find(
    (comment) =>
      comment.episodeId === episode.id &&
      comment.body === check.body &&
      comment.quote === (passage?.quote ?? null) &&
      !comment.removedAt &&
      now.getTime() - comment.createdAt.getTime() < COMMENT_DUPLICATE_WINDOW_MS,
  );
  if (repeat) {
    const existing = await prisma.comment.findUniqueOrThrow({ where: { id: repeat.id }, select: commentSelect });
    return { ok: true, comment: toView(existing), created: false };
  }

  if (commentRateLimited(recent.map((comment) => comment.createdAt), now.getTime())) {
    return failure(429, "RATE_LIMITED", `${ERROR_COPY[429].title} Wait a few minutes, then try again.`);
  }

  const created = await prisma.comment.create({
    data: {
      userId,
      episodeId: episode.id,
      body: check.body,
      createdAt: now,
      ...(passage ? { quote: passage.quote, quotePrefix: passage.prefix, quoteSuffix: passage.suffix } : {}),
    },
    select: commentSelect,
  });
  return { ok: true, comment: toView(created), created: true };
}

/** A visible comment on a public episode, with who may moderate it. */
export async function findActionableComment(commentId: unknown) {
  if (!isUsableId(commentId)) return null;
  return prisma.comment.findFirst({
    where: { id: commentId, ...VISIBLE, episode: PUBLIC_EPISODE_WHERE },
    select: { id: true, userId: true, episode: { select: { id: true, series: { select: { authorId: true } } } } },
  });
}

export async function editComment(userId: string, commentId: unknown, rawBody: unknown): Promise<PostResult> {
  const check = checkCommentBody(rawBody);
  if (!check.ok) return failure(400, "BAD_REQUEST", check.message);
  const screened = await screenCommentText(check.body);
  if (!screened.ok) return failure(400, "BAD_REQUEST", screened.message);
  const comment = await findActionableComment(commentId);
  // Someone else's comment looks the same as a missing one.
  if (!comment || comment.userId !== userId) return failure(404, "NOT_FOUND", "Comment not found.");
  // Sweep 1: edits are limited too (posting has its own limits above).
  if (!(await takeRateLimit(userId, "comment-edit", EDIT_RATE_LIMITS))) {
    return failure(429, "RATE_LIMITED", `${ERROR_COPY[429].title} Wait a moment, then try again.`);
  }

  const updated = await prisma.comment.update({
    where: { id: comment.id },
    data: { body: check.body, editedAt: new Date() },
    select: commentSelect,
  });
  return { ok: true, comment: toView(updated), created: false };
}

export type CommentPermissions = { canEdit: boolean; canDelete: boolean; canRemove: boolean; canReport: boolean };

/** What `viewer` may do with a comment by `authorId` on a series by `seriesAuthorId`. */
export function commentPermissions(
  viewer: { id: string; role: AppRole | string } | null,
  authorId: string,
  seriesAuthorId: string,
): CommentPermissions {
  if (!viewer) return { canEdit: false, canDelete: false, canRemove: false, canReport: false };
  const own = viewer.id === authorId;
  return {
    canEdit: own,
    canDelete: own,
    canRemove: !own && (viewer.id === seriesAuthorId || hasRoleAccess(viewer.role, "BOARD")),
    canReport: !own,
  };
}

type DeleteResult = { ok: true; outcome: "deleted" | "removed" } | EngagementFailure;

/**
 * The comment's author deletes it outright. The series author or Board/CEO
 * remove it instead (hidden, kept for its reports, open reports closed as
 * actioned); Board/CEO removals are audited.
 */
export async function deleteComment(viewer: { id: string; role: AppRole }, commentId: unknown): Promise<DeleteResult> {
  const comment = await findActionableComment(commentId);
  if (!comment) return failure(404, "NOT_FOUND", "Comment not found.");

  const permissions = commentPermissions(viewer, comment.userId, comment.episode.series.authorId);
  if (permissions.canDelete) {
    await prisma.comment.delete({ where: { id: comment.id } });
    return { ok: true, outcome: "deleted" };
  }
  if (!permissions.canRemove) return failure(403, "FORBIDDEN", "You can't remove this comment.");

  await removeCommentAsModerator(viewer, comment.id, comment.userId, {
    audited: viewer.id !== comment.episode.series.authorId,
  });
  return { ok: true, outcome: "removed" };
}

export const PASSAGE_COMMENTS_LOADED = 300;

/**
 * Sweep I: the visible comments on passages of an episode, newest first (up
 * to PASSAGE_COMMENTS_LOADED), each with where its passage is now. Comments
 * whose passage was changed away are left out here (they still show in the
 * comments list, marked as changed).
 */
export async function listPassageComments(episodeId: string, blocks: readonly string[]) {
  const rows = await prisma.comment.findMany({
    where: { episodeId, ...VISIBLE, quote: { not: null } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PASSAGE_COMMENTS_LOADED,
    select: commentSelect,
  });
  return rows.flatMap((row) => {
    const view = toView(row);
    const range = view.passage ? resolveAnchor(blocks, view.passage) : null;
    return range ? [{ comment: view, range }] : [];
  });
}

/** Hides a comment and closes its open reports as actioned. */
export async function removeCommentAsModerator(
  actor: { id: string },
  commentId: string,
  commentAuthorId: string,
  options: { audited: boolean; reportId?: string },
) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.comment.update({ where: { id: commentId }, data: { removedAt: now, removedById: actor.id } });
    await tx.contentReport.updateMany({
      where: { commentId, status: "OPEN" },
      data: { status: "ACTIONED", resolvedAt: now, resolvedById: actor.id },
    });
    if (options.audited) {
      await recordAudit(tx, {
        action: AUDIT.COMMENT_REMOVED,
        actorId: actor.id,
        targetUserId: commentAuthorId,
        details: { commentId, ...(options.reportId ? { reportId: options.reportId } : {}) },
      });
    }
  });
}
