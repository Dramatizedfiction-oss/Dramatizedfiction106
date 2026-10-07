import { prisma } from "@/lib/prisma";

const PHASE_UNLOCK_CODE = "0424";

export type PlatformSettings = {
  siteName: string;
  enableAds: boolean;
  enablePayments: boolean;
  phaseTwoUnlocked: boolean;
  phaseThreeUnlocked: boolean;
};

const DEFAULT_SETTINGS: PlatformSettings = {
  siteName: "Dramatized Fiction",
  enableAds: false,
  enablePayments: false,
  phaseTwoUnlocked: false,
  phaseThreeUnlocked: false,
};

const settingsSelect = {
  siteName: true,
  enableAds: true,
  enablePayments: true,
  phaseTwoUnlocked: true,
  phaseThreeUnlocked: true,
} as const;

/**
 * Read-only: safe during rendering. A missing row reads as the defaults
 * (every phase locked/off) without being created.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const existing = await prisma.settings.findFirst({ select: settingsSelect });
  return existing ?? DEFAULT_SETTINGS;
}

/** For the CEO settings write path only: returns the row, creating it if missing. */
export async function ensurePlatformSettings() {
  const existing = await prisma.settings.findFirst();

  if (existing) {
    return existing;
  }

  return prisma.settings.create({ data: DEFAULT_SETTINGS });
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
