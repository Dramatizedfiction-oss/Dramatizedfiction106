import { AUDIT, recordAudit } from "@/lib/admin/audit";
import { ensurePlatformSettingsId, getPlatformSettings } from "@/lib/phases";
import { prisma } from "@/lib/prisma";
import { deleteReplacedImage, isOwnedImageUrl } from "@/lib/uploads/image-storage";

/*
 * Administration's shared avatar library and the Reader/Writer default
 * choices. Defaults are display-time fallbacks only: changing them never
 * touches a member's own picture (User.image).
 */

export async function listPlatformAvatars() {
  const [avatars, settings] = await Promise.all([
    prisma.platformAvatar.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, url: true, createdAt: true, createdBy: { select: { name: true } } },
    }),
    getPlatformSettings(),
  ]);
  return { avatars, readerDefaultId: settings.defaultReaderAvatarId, writerDefaultId: settings.defaultWriterAvatarId };
}

export async function addPlatformAvatar(actorId: string, input: { url: string; label: string }) {
  const url = input.url.trim();
  const label = input.label.trim().slice(0, 80) || "Avatar";
  if (!isOwnedImageUrl(url) || !new URL(url).pathname.startsWith("/images/platform-avatar/")) {
    return { ok: false as const, status: 400, message: "Upload the image with the avatar uploader first." };
  }
  const avatar = await prisma.platformAvatar.create({
    data: { url, label, createdById: actorId },
    select: { id: true, label: true, url: true, createdAt: true },
  });
  await recordAudit(prisma, { action: AUDIT.AVATAR_ADDED, actorId, details: { avatarId: avatar.id } });
  return { ok: true as const, avatar };
}

/** Removes an avatar. If it was a default, that default falls back to the built-in one (FK SET NULL). */
export async function removePlatformAvatar(actorId: string, id: string) {
  const avatar = await prisma.platformAvatar.findUnique({ where: { id }, select: { id: true, url: true } });
  if (!avatar) return { ok: false as const, status: 404, message: "Avatar not found." };
  await prisma.$transaction(async (tx) => {
    await tx.platformAvatar.delete({ where: { id } });
    await recordAudit(tx, { action: AUDIT.AVATAR_REMOVED, actorId, details: { avatarId: id } });
  });
  await deleteReplacedImage(avatar.url, null);
  return { ok: true as const };
}

export async function setDefaultAvatars(actorId: string, input: { readerId: string | null; writerId: string | null }) {
  const ids = [input.readerId, input.writerId].filter((value): value is string => Boolean(value));
  if (ids.length) {
    const found = await prisma.platformAvatar.count({ where: { id: { in: ids } } });
    if (found !== new Set(ids).size) return { ok: false as const, status: 400, message: "Choose avatars from the library." };
  }
  const settingsId = await ensurePlatformSettingsId();
  await prisma.$transaction(async (tx) => {
    await tx.settings.update({
      where: { id: settingsId },
      data: { defaultReaderAvatarId: input.readerId, defaultWriterAvatarId: input.writerId },
    });
    await recordAudit(tx, { action: AUDIT.AVATAR_DEFAULTS, actorId, details: input });
  });
  return { ok: true as const };
}

/** The image URL for a default ("reader" | "writer"): the chosen library avatar, or null for the built-in one. */
export async function resolveDefaultAvatarUrl(kind: "reader" | "writer") {
  const settings = await prisma.settings.findFirst({
    orderBy: { id: "asc" },
    select: {
      defaultReaderAvatar: { select: { url: true } },
      defaultWriterAvatar: { select: { url: true } },
    },
  });
  return (kind === "reader" ? settings?.defaultReaderAvatar?.url : settings?.defaultWriterAvatar?.url) ?? null;
}
