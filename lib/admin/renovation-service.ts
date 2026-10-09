import { AUDIT, recordAudit } from "@/lib/admin/audit";
import { ensurePlatformSettingsId } from "@/lib/phases";
import { prisma } from "@/lib/prisma";

/** Turns Renovation Mode on or off (CEO only; the caller checks). Idempotent. */
export async function setRenovationMode(actorId: string, enabled: boolean) {
  const settingsId = await ensurePlatformSettingsId();
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.settings.updateMany({
      where: { id: settingsId, renovationMode: !enabled },
      data: { renovationMode: enabled, renovationChangedAt: new Date() },
    });
    if (count > 0) await recordAudit(tx, { action: AUDIT.RENOVATION, actorId, details: { enabled } });
    return { changed: count > 0, enabled };
  });
}
