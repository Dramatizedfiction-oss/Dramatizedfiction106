import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CEO_PASSWORD_MAX_FAILURES,
  CEO_PASSWORD_WINDOW_MS,
  ceoPasswordMessage,
  verifyCeoPassword,
} from "@/lib/admin/ceo-password";

/*
 * Audit records for sensitive administrative actions, and the throttled CEO
 * password check built on them. Details never contain passwords or secrets.
 */

export const AUDIT = {
  BAN: "MEMBER_BANNED",
  DISCIPLINE: "MEMBER_DISCIPLINED",
  LIFT: "RESTRICTION_LIFTED",
  ROLE_CHANGE: "ROLE_CHANGED",
  CEO_PASSWORD_FAILED: "CEO_PASSWORD_FAILED",
  RENOVATION: "RENOVATION_CHANGED",
  PHASE_ACTIVATED: "PHASE_ACTIVATED",
  AVATAR_ADDED: "AVATAR_ADDED",
  AVATAR_REMOVED: "AVATAR_REMOVED",
  AVATAR_DEFAULTS: "AVATAR_DEFAULTS_CHANGED",
} as const;

type Db = Prisma.TransactionClient | typeof prisma;

export async function recordAudit(
  db: Db,
  entry: { action: string; actorId: string; targetUserId?: string | null; details?: Prisma.InputJsonValue },
) {
  await db.adminAuditLog.create({
    data: {
      action: entry.action,
      actorId: entry.actorId,
      targetUserId: entry.targetUserId ?? null,
      details: entry.details,
    },
  });
}

export type CeoPasswordGate = { ok: true } | { ok: false; status: number; code: string; message: string };

/**
 * Verifies the CEO password for `actorId` (who must already be confirmed as a
 * CEO by the caller). After CEO_PASSWORD_MAX_FAILURES failures within the
 * window, further attempts are refused until it passes.
 */
export async function checkCeoPassword(actorId: string, submitted: unknown): Promise<CeoPasswordGate> {
  const since = new Date(Date.now() - CEO_PASSWORD_WINDOW_MS);
  const failures = await prisma.adminAuditLog.count({
    where: { actorId, action: AUDIT.CEO_PASSWORD_FAILED, createdAt: { gte: since } },
  });
  if (failures >= CEO_PASSWORD_MAX_FAILURES) {
    return {
      ok: false,
      status: 429,
      code: "TOO_MANY_ATTEMPTS",
      message: "Too many incorrect CEO password attempts. Wait 15 minutes and try again.",
    };
  }

  const check = verifyCeoPassword(submitted);
  if (check === "OK") return { ok: true };
  if (check === "NOT_CONFIGURED") {
    console.error("CEO password check refused: CEO_PASSWORD is not configured.");
    return { ok: false, status: 503, code: "NOT_CONFIGURED", message: ceoPasswordMessage(check) };
  }

  await recordAudit(prisma, { action: AUDIT.CEO_PASSWORD_FAILED, actorId });
  return { ok: false, status: 403, code: "INVALID_PASSWORD", message: ceoPasswordMessage(check) };
}
