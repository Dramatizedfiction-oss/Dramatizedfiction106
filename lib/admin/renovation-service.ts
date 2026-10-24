import { revalidateTag } from "next/cache";
import { AUDIT, recordAudit } from "@/lib/admin/audit";
import { LAYOUT_CACHE_TAG } from "@/lib/layout-data";
import { ensurePlatformSettingsId } from "@/lib/phases";
import { prisma } from "@/lib/prisma";

/** Turns Renovation Mode on or off (CEO only; the caller checks). Idempotent. */
export async function setRenovationMode(actorId: string, enabled: boolean) {
  const settingsId = await ensurePlatformSettingsId();
  const result = await prisma.$transaction(async (tx) => {
    const { count } = await tx.settings.updateMany({
      where: { id: settingsId, renovationMode: !enabled },
      data: { renovationMode: enabled, renovationChangedAt: new Date() },
    });
    if (count > 0) await recordAudit(tx, { action: AUDIT.RENOVATION, actorId, details: { enabled } });
    return { changed: count > 0, enabled };
  });
  // The root layout caches Renovation Mode (lib/layout-data.ts); show the change at once.
  revalidateTag(LAYOUT_CACHE_TAG);
  return result;
}
