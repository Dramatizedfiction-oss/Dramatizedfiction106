import { prisma } from "@/lib/prisma";

/*
 * The single platform Settings row. Phase 2/3 flags are only changed by the
 * CEO Studio activation flow (lib/ceo/phase-activation.ts); renovation and
 * avatar defaults only through Administration. There is no unlock code: the
 * old hard-coded code was removed in favor of the CEO password (CEO_PASSWORD).
 */

export type PlatformSettings = {
  siteName: string;
  enableAds: boolean;
  enablePayments: boolean;
  phaseTwoUnlocked: boolean;
  phaseThreeUnlocked: boolean;
  phaseTwoActivatedAt: Date | null;
  phaseThreeActivatedAt: Date | null;
  renovationMode: boolean;
  renovationChangedAt: Date | null;
  defaultReaderAvatarId: string | null;
  defaultWriterAvatarId: string | null;
};

const DEFAULT_SETTINGS: PlatformSettings = {
  siteName: "Dramatized Fiction",
  enableAds: false,
  enablePayments: false,
  phaseTwoUnlocked: false,
  phaseThreeUnlocked: false,
  phaseTwoActivatedAt: null,
  phaseThreeActivatedAt: null,
  renovationMode: false,
  renovationChangedAt: null,
  defaultReaderAvatarId: null,
  defaultWriterAvatarId: null,
};

const settingsSelect = {
  siteName: true,
  enableAds: true,
  enablePayments: true,
  phaseTwoUnlocked: true,
  phaseThreeUnlocked: true,
  phaseTwoActivatedAt: true,
  phaseThreeActivatedAt: true,
  renovationMode: true,
  renovationChangedAt: true,
  defaultReaderAvatarId: true,
  defaultWriterAvatarId: true,
} as const;

/**
 * Read-only: safe during rendering. A missing row reads as the defaults
 * (every phase locked/off, renovation off) without being created.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const existing = await prisma.settings.findFirst({ orderBy: { id: "asc" }, select: settingsSelect });
  return existing ?? DEFAULT_SETTINGS;
}

/** For write paths only: returns the row's id, creating the row if missing. */
export async function ensurePlatformSettingsId(): Promise<string> {
  const existing = await prisma.settings.findFirst({ orderBy: { id: "asc" }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.settings.create({ data: {}, select: { id: true } });
  return created.id;
}

export async function isPhaseTwoActive() {
  const settings = await getPlatformSettings();
  return settings.phaseTwoUnlocked && settings.enablePayments;
}

export async function isPhaseThreeActive() {
  const settings = await getPlatformSettings();
  return settings.phaseThreeUnlocked && settings.enableAds;
}

export async function isRenovationMode() {
  const settings = await getPlatformSettings();
  return settings.renovationMode;
}
