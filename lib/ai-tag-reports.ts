import type { AiUsageTag } from "@prisma/client";
import { AUDIT, recordAudit } from "@/lib/admin/audit";
import { PUBLIC_SERIES_WHERE } from "@/lib/content-visibility";
import { REPORT_NOTE_MAX_LENGTH, normalizeCommentBody } from "@/lib/engagement-rules";
import { failure, findPublicEpisode, isUsableId, type EngagementFailure } from "@/lib/engagement";
import { prisma } from "@/lib/prisma";

/*
 * Reports that a series' or episode's AI usage tag is wrong. Members file them
 * from the "Report incorrect AI tag" button; Board and CEO review them in
 * Administration > Reports (AI tags) and mark them reviewed or dismiss them.
 * Reviewing never changes the tag itself.
 */

/** The stored tag values (the AiUsageTag enum), checked as-is; nothing here converts tags. */
const TAG_VALUES = ["AI_FREE", "AI_CORRECTED", "AI_HEAVY", "AI_WRITTEN"] as const;

function parseSuggestedTag(value: unknown): AiUsageTag | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  return (TAG_VALUES as readonly string[]).includes(value as string) ? (value as AiUsageTag) : undefined;
}

export async function fileAiTagReport(
  reporterId: string,
  input: { seriesId?: unknown; episodeId?: unknown; suggestedTag?: unknown; note?: unknown },
): Promise<{ ok: true; created: boolean } | EngagementFailure> {
  const suggestedTag = parseSuggestedTag(input.suggestedTag);
  if (suggestedTag === undefined) return failure(400, "BAD_REQUEST", "Choose a tag, or \"Not sure\".");
  const note = typeof input.note === "string" ? normalizeCommentBody(input.note) : "";
  if (note.length > REPORT_NOTE_MAX_LENGTH) return failure(400, "BAD_REQUEST", `Notes can be up to ${REPORT_NOTE_MAX_LENGTH} characters.`);

  // The thing reported: a published episode (and its series), or a published series.
  let target: { seriesId: string; episodeId: string | null; authorIds: string[] } | null = null;
  if (input.episodeId !== undefined && input.episodeId !== null) {
    const episode = await findPublicEpisode(input.episodeId);
    if (episode) target = { seriesId: episode.seriesId, episodeId: episode.id, authorIds: [episode.authorId, episode.series.authorId] };
  } else if (isUsableId(input.seriesId)) {
    const series = await prisma.series.findFirst({ where: { id: input.seriesId, ...PUBLIC_SERIES_WHERE }, select: { id: true, authorId: true } });
    if (series) target = { seriesId: series.id, episodeId: null, authorIds: [series.authorId] };
  }
  if (!target) return failure(404, "NOT_FOUND", "That story isn't available.");
  if (target.authorIds.includes(reporterId)) {
    return failure(403, "OWN_CONTENT", "This is your own story: you can change its AI tag in Writer Studio.");
  }

  // One open report per member per series/episode; repeating changes nothing.
  const existing = await prisma.aiTagReport.findFirst({
    where: { reporterId, seriesId: target.seriesId, episodeId: target.episodeId, status: "OPEN" },
    select: { id: true },
  });
  if (existing) return { ok: true, created: false };

  await prisma.aiTagReport.create({
    data: { reporterId, seriesId: target.seriesId, episodeId: target.episodeId, suggestedTag, note: note || null },
  });
  return { ok: true, created: true };
}

export const AI_TAG_REPORT_PAGE_SIZE = 25;

export async function listAiTagReports(filter: "open" | "closed", page = 1) {
  const where = filter === "open" ? { status: "OPEN" as const } : { status: { not: "OPEN" as const } };
  const [reports, total] = await Promise.all([
    prisma.aiTagReport.findMany({
      where,
      orderBy: { createdAt: filter === "open" ? "asc" : "desc" },
      skip: (page - 1) * AI_TAG_REPORT_PAGE_SIZE,
      take: AI_TAG_REPORT_PAGE_SIZE,
      select: {
        id: true,
        suggestedTag: true,
        note: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
        reporter: { select: { name: true } },
        resolvedBy: { select: { name: true } },
        series: { select: { id: true, title: true, aiUsageTag: true, author: { select: { id: true, name: true } } } },
        episode: { select: { id: true, title: true, episodeNumber: true, aiUsageTag: true } },
      },
    }),
    prisma.aiTagReport.count({ where }),
  ]);
  return { reports, total };
}

export function openAiTagReportCount() {
  return prisma.aiTagReport.count({ where: { status: "OPEN" } });
}

/** Board/CEO: mark an open report reviewed (ACTIONED) or dismiss it. Audited. */
export async function resolveAiTagReport(
  actor: { id: string },
  reportId: unknown,
  action: "MARK_REVIEWED" | "DISMISS",
): Promise<{ ok: true } | EngagementFailure> {
  if (!isUsableId(reportId)) return failure(404, "NOT_FOUND", "Report not found.");
  const report = await prisma.aiTagReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, seriesId: true, episodeId: true, series: { select: { authorId: true } } },
  });
  if (!report) return failure(404, "NOT_FOUND", "Report not found.");
  if (report.status !== "OPEN") return failure(409, "CONFLICT", "This report has already been handled.");

  await prisma.$transaction(async (tx) => {
    await tx.aiTagReport.update({
      where: { id: report.id },
      data: { status: action === "DISMISS" ? "DISMISSED" : "ACTIONED", resolvedAt: new Date(), resolvedById: actor.id },
    });
    await recordAudit(tx, {
      action: action === "DISMISS" ? AUDIT.AI_TAG_REPORT_DISMISSED : AUDIT.AI_TAG_REPORT_REVIEWED,
      actorId: actor.id,
      targetUserId: report.series.authorId,
      details: { reportId: report.id, seriesId: report.seriesId, episodeId: report.episodeId },
    });
  });
  return { ok: true };
}
