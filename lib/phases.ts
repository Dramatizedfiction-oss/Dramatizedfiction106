import { prisma } from "@/lib/prisma";

const PHASE_UNLOCK_CODE = "0424";

export async function getPlatformSettings() {
  const existing = await prisma.settings.findFirst();

  if (existing) {
    return existing;
  }

  return prisma.settings.create({
    data: {
      siteName: "Dramatized Fiction",
      enableAds: false,
      enablePayments: false,
      phaseTwoUnlocked: false,
      phaseThreeUnlocked: false
    }
  });
}

export async function isPhaseTwoActive() {
  const settings = await getPlatformSettings();
  return settings.phaseTwoUnlocked && settings.enablePayments;
}

export async function isPhaseThreeActive() {
  const settings = await getPlatformSettings();
  return settings.phaseThreeUnlocked && settings.enableAds;
}

export function isValidPhaseUnlockCode(code: string | null | undefined) {
  return code === PHASE_UNLOCK_CODE;
}
