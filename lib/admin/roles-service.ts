import type { Prisma } from "@prisma/client";
import { AUDIT, recordAudit } from "@/lib/admin/audit";
import { decideRoleChange, type RoleChange } from "@/lib/admin/policy";
import { prisma } from "@/lib/prisma";

export type RoleChangeResult =
  | { ok: true; from: string; to: string }
  | { ok: false; status: number; code: string; message: string };

const STATUS_BY_CODE: Record<string, number> = {
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BOARD_FULL: 409,
  LAST_CEO: 409,
  NO_CHANGE: 409,
  INVALID: 400,
};

/**
 * Applies a Board/CEO role change. The caller has already confirmed the
 * session user is a CEO and verified the CEO password; this re-reads both
 * accounts inside a transaction serialized by an advisory lock, so two
 * concurrent requests can't both add a 7th Board member or remove the last
 * two CEOs.
 */
export async function changeMemberRole(actorId: string, targetId: string, change: RoleChange): Promise<RoleChangeResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('df:role-change'))`;

    const [actor, target, boardCount, ceoCount] = await Promise.all([
      tx.user.findUnique({ where: { id: actorId }, select: { id: true, role: true } }),
      tx.user.findUnique({
        where: { id: targetId },
        select: { id: true, role: true, writerPolicyAcknowledged: true, _count: { select: { series: true } } },
      }),
      tx.user.count({ where: { role: "BOARD" } }),
      tx.user.count({ where: { role: "CEO" } }),
    ]);

    if (!actor) return fail("FORBIDDEN", "Your account could not be verified.");
    if (!target) return fail("NOT_FOUND", "Member not found.");

    const decision = decideRoleChange({
      actor,
      target,
      change,
      boardCount,
      ceoCount,
      previousRole: await previousRoleFor(tx, target.id, target.role),
      targetHasWriterHistory: target.writerPolicyAcknowledged || target._count.series > 0,
    });
    if (!decision.ok) return fail(decision.code, decision.message);

    await tx.user.update({ where: { id: target.id }, data: { role: decision.to } });
    await recordAudit(tx, {
      action: AUDIT.ROLE_CHANGE,
      actorId: actor.id,
      targetUserId: target.id,
      details: { change, from: decision.from, to: decision.to },
    });

    return { ok: true, from: decision.from, to: decision.to } as const;
  }, LOCKED_TRANSACTION);
}

/** Requests queue on the advisory lock, so allow time to wait instead of failing. */
const LOCKED_TRANSACTION = { maxWait: 15_000, timeout: 20_000 } as const;

/** The role recorded just before the member's current role was granted, if any. */
async function previousRoleFor(tx: Prisma.TransactionClient, userId: string, currentRole: string) {
  const entry = await tx.adminAuditLog.findFirst({
    where: { action: AUDIT.ROLE_CHANGE, targetUserId: userId },
    orderBy: { createdAt: "desc" },
    select: { details: true },
  });
  const details = entry?.details as { from?: string; to?: string } | null;
  return details?.to === currentRole ? details.from ?? null : null;
}

function fail(code: string, message: string) {
  return { ok: false as const, status: STATUS_BY_CODE[code] ?? 400, code, message };
}
