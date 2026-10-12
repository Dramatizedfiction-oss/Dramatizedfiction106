import { AUDIT, recordAudit } from "@/lib/admin/audit";
import { findActionableComment, removeCommentAsModerator } from "@/lib/comments";
import { REPORT_NOTE_MAX_LENGTH, isReportReason, normalizeCommentBody } from "@/lib/engagement-rules";
import { failure, isUsableId, type EngagementFailure } from "@/lib/engagement";
import { prisma } from "@/lib/prisma";

/*
 * Comment reports. Members report someone else's comment (once each; a repeat
 * report is accepted and changes nothing). Board and CEO review them in
 * Administration > Reports: remove the comment, or dismiss the report.
 */

export async function fileReport(
  reporterId: string,
  commentId: unknown,
  input: { reason: unknown; note?: unknown },
): Promise<{ ok: true } | EngagementFailure> {
  if (!isReportReason(input.reason)) return failure(400, "BAD_REQUEST", "Choose a reason for the report.");
  const note = typeof input.note === "string" ? normalizeCommentBody(input.note) : "";
  if (note.length > REPORT_NOTE_MAX_LENGTH) {
    return failure(400, "BAD_REQUEST", `Notes can be up to ${REPORT_NOTE_MAX_LENGTH} characters.`);
  }

  const comment = await findActionableComment(commentId);
  if (!comment) return failure(404, "NOT_FOUND", "Comment not found.");
  if (comment.userId === reporterId) return failure(403, "OWN_COMMENT", "You can't report your own comment.");

  await prisma.contentReport.createMany({
    data: [{ commentId: comment.id, reporterId, reason: input.reason, note: note || null }],
    skipDuplicates: true,
  });
  return { ok: true };
}

export const REPORT_PAGE_SIZE = 25;
export type ReportFilter = "open" | "closed";

export function parseReportFilter(value: unknown): ReportFilter {
  return value === "closed" ? "closed" : "open";
}

export async function listReports(filter: ReportFilter, page = 1) {
  const where = filter === "open" ? { status: "OPEN" as const } : { status: { not: "OPEN" as const } };
  const [reports, total] = await Promise.all([
    prisma.contentReport.findMany({
      where,
      orderBy: { createdAt: filter === "open" ? "asc" : "desc" },
      skip: (page - 1) * REPORT_PAGE_SIZE,
      take: REPORT_PAGE_SIZE,
      select: {
        id: true,
        reason: true,
        note: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        reporter: { select: { id: true, name: true } },
        resolvedBy: { select: { name: true } },
        comment: {
          select: {
            id: true,
            body: true,
            createdAt: true,
            removedAt: true,
            user: { select: { id: true, name: true, image: true, role: true } },
            episode: { select: { id: true, title: true, episodeNumber: true, series: { select: { title: true } } } },
            _count: { select: { reports: true } },
          },
        },
      },
    }),
    prisma.contentReport.count({ where }),
  ]);
  return { reports, total };
}

export function openReportCount() {
  return prisma.contentReport.count({ where: { status: "OPEN" } });
}

/** Board/CEO decision on an open report. Removing the comment closes every open report on it. */
export async function resolveReport(
  actor: { id: string },
  reportId: unknown,
  action: "REMOVE_COMMENT" | "DISMISS",
): Promise<{ ok: true } | EngagementFailure> {
  if (!isUsableId(reportId)) return failure(404, "NOT_FOUND", "Report not found.");
  const report = await prisma.contentReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, comment: { select: { id: true, userId: true, removedAt: true } } },
  });
  if (!report) return failure(404, "NOT_FOUND", "Report not found.");
  if (report.status !== "OPEN") return failure(409, "CONFLICT", "This report has already been handled.");

  if (action === "REMOVE_COMMENT" && !report.comment.removedAt) {
    await removeCommentAsModerator(actor, report.comment.id, report.comment.userId, { audited: true, reportId: report.id });
    return { ok: true };
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.contentReport.update({
      where: { id: report.id },
      data: {
        status: action === "DISMISS" ? "DISMISSED" : "ACTIONED",
        resolvedAt: now,
        resolvedById: actor.id,
      },
    });
    if (action === "DISMISS") {
      await recordAudit(tx, {
        action: AUDIT.REPORT_DISMISSED,
        actorId: actor.id,
        targetUserId: report.comment.userId,
        details: { reportId: report.id, commentId: report.comment.id },
      });
    }
  });
  return { ok: true };
}
