import { AUDIT, recordAudit } from "@/lib/admin/audit";
import { activeRestriction, decideModeration, disciplineEndsAt, type ModerationAction } from "@/lib/admin/policy";
import { prisma } from "@/lib/prisma";

export type ModerationResult =
  | { ok: true; restrictionId: string; endsAt: Date | null }
  | { ok: false; status: number; code: string; message: string };

/**
 * Bans, one-month discipline actions and lifting them. Restrictions never
 * change a member's role or writer status: when one ends (lifted, or a
 * discipline action reaching its end date) the member simply has their
 * existing access again. Each member's changes are serialized with an
 * advisory lock so two administrators can't create overlapping restrictions.
 */
export async function moderateMember(input: {
  actorId: string;
  targetId: string;
  action: ModerationAction;
  reason: string;
}): Promise<ModerationResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('df:moderation'), hashtext(${input.targetId}))`;
    const now = new Date();

    const [actor, target] = await Promise.all([
      tx.user.findUnique({ where: { id: input.actorId }, select: { id: true, role: true } }),
      tx.user.findUnique({
        where: { id: input.targetId },
        select: {
          id: true,
          role: true,
          restrictions: {
            where: { liftedAt: null },
            select: { id: true, kind: true, imposedAt: true, endsAt: true, liftedAt: true },
          },
        },
      }),
    ]);
    if (!actor) return fail(403, "FORBIDDEN", "Your account could not be verified.");
    if (!target) return fail(404, "NOT_FOUND", "Member not found.");

    const current = activeRestriction(target.restrictions, now);
    const decision = decideModeration({ actor, target, action: input.action, current, reason: input.reason });
    if (!decision.ok) return fail(decision.code === "FORBIDDEN" ? 403 : 400, decision.code, decision.message);

    if (input.action === "LIFT") {
      await tx.memberRestriction.update({
        where: { id: current!.id },
        data: { liftedAt: now, liftedById: actor.id, liftNote: input.reason.trim() || null },
      });
      await recordAudit(tx, {
        action: AUDIT.LIFT,
        actorId: actor.id,
        targetUserId: target.id,
        details: { restrictionId: current!.id, kind: current!.kind },
      });
      return { ok: true, restrictionId: current!.id, endsAt: null } as const;
    }

    // Banning someone who is under discipline replaces the discipline action.
    if (input.action === "BAN" && current?.kind === "DISCIPLINE") {
      await tx.memberRestriction.update({
        where: { id: current.id },
        data: { liftedAt: now, liftedById: actor.id, liftNote: "Replaced by a permanent ban." },
      });
    }

    const endsAt = input.action === "DISCIPLINE" ? disciplineEndsAt(now) : null;
    const created = await tx.memberRestriction.create({
      data: {
        userId: target.id,
        kind: input.action,
        reason: input.reason.trim(),
        imposedById: actor.id,
        imposedAt: now,
        endsAt,
      },
      select: { id: true },
    });
    await recordAudit(tx, {
      action: input.action === "BAN" ? AUDIT.BAN : AUDIT.DISCIPLINE,
      actorId: actor.id,
      targetUserId: target.id,
      details: { restrictionId: created.id, endsAt: endsAt?.toISOString() ?? null },
    });
    return { ok: true, restrictionId: created.id, endsAt } as const;
  }, { maxWait: 15_000, timeout: 20_000 }); // requests for one member queue on the advisory lock
}

function fail(status: number, code: string, message: string) {
  return { ok: false as const, status, code, message };
}
