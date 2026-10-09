import { AUDIT, recordAudit } from "@/lib/admin/audit";
import { evaluatePhaseReadiness, type PhaseNumber, type Requirement } from "@/lib/ceo/phase-readiness";
import { ensurePlatformSettingsId } from "@/lib/phases";
import { prisma } from "@/lib/prisma";

export type ActivationResult =
  | { ok: true; alreadyActive: boolean; activatedAt: Date }
  | { ok: false; status: number; code: "NOT_READY"; message: string; requirements: Requirement[] };

/**
 * Activates a phase. The caller has already verified the session user is a
 * CEO and checked the CEO password. Refuses unless every readiness
 * requirement is met. The flag change is a single conditional UPDATE
 * (only where the phase is still off), so repeated or concurrent requests
 * activate at most once and never leave a half-set state.
 */
export async function activatePhase(
  actorId: string,
  phase: PhaseNumber,
  evaluate: typeof evaluatePhaseReadiness = evaluatePhaseReadiness,
): Promise<ActivationResult> {
  const readiness = evaluate(phase, process.env);
  if (!readiness.ready) {
    return {
      ok: false,
      status: 409,
      code: "NOT_READY",
      message: "This phase can't be activated yet. Nothing was changed.",
      requirements: readiness.requirements,
    };
  }

  const settingsId = await ensurePlatformSettingsId();
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const { count } =
      phase === 2
        ? await tx.settings.updateMany({
            where: { id: settingsId, phaseTwoUnlocked: false },
            data: { phaseTwoUnlocked: true, enablePayments: true, phaseTwoActivatedAt: now },
          })
        : await tx.settings.updateMany({
            where: { id: settingsId, phaseThreeUnlocked: false },
            data: { phaseThreeUnlocked: true, enableAds: true, phaseThreeActivatedAt: now },
          });

    const row = await tx.settings.findUniqueOrThrow({
      where: { id: settingsId },
      select: { phaseTwoActivatedAt: true, phaseThreeActivatedAt: true },
    });
    const activatedAt = (phase === 2 ? row.phaseTwoActivatedAt : row.phaseThreeActivatedAt) ?? now;

    if (count === 0) return { ok: true, alreadyActive: true, activatedAt } as const;

    await recordAudit(tx, { action: AUDIT.PHASE_ACTIVATED, actorId, details: { phase } });
    return { ok: true, alreadyActive: false, activatedAt } as const;
  });
}
