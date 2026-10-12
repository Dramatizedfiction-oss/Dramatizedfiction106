import { AUDIT, recordAudit } from "@/lib/admin/audit";
import { decideWriterLevelChange } from "@/lib/admin/policy";
import { prisma } from "@/lib/prisma";

export type WriterLevelResult =
  | { ok: true; level: string }
  | { ok: false; status: number; code: string; message: string };

/**
 * Board/CEO set a writer's level (User.writerStatus). Rules in
 * lib/admin/policy.ts (decideWriterLevelChange); audited. Serialized per
 * member with the moderation lock so two administrators can't race.
 */
export async function changeWriterLevel(input: { actorId: string; targetId: string; level: string }): Promise<WriterLevelResult> {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('df:moderation'), hashtext(${input.targetId}))`;
      const [actor, target] = await Promise.all([
        tx.user.findUnique({ where: { id: input.actorId }, select: { id: true, role: true } }),
        tx.user.findUnique({ where: { id: input.targetId }, select: { id: true, role: true, writerStatus: true } }),
      ]);
      if (!actor) return { ok: false as const, status: 403, code: "FORBIDDEN", message: "Your account could not be verified." };
      if (!target) return { ok: false as const, status: 404, code: "NOT_FOUND", message: "Member not found." };

      const decision = decideWriterLevelChange({ actor, target, level: input.level });
      if (!decision.ok) return { ok: false as const, status: decision.code === "FORBIDDEN" ? 403 : 400, code: decision.code, message: decision.message };

      await tx.user.update({ where: { id: target.id }, data: { writerStatus: decision.level } });
      await recordAudit(tx, {
        action: AUDIT.WRITER_LEVEL_CHANGED,
        actorId: actor.id,
        targetUserId: target.id,
        details: { from: target.writerStatus, to: decision.level },
      });
      return { ok: true as const, level: decision.level };
    },
    { maxWait: 15_000, timeout: 20_000 },
  );
}
