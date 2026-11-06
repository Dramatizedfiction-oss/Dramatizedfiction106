import { AUDIT, recordAudit } from "@/lib/admin/audit";
import { ensurePlatformSettingsId } from "@/lib/phases";
import { prisma } from "@/lib/prisma";
import { screenStoreImage } from "@/lib/store/screening";
import { CENTERED_CROP, clampCrop, type AvatarCrop } from "@/lib/avatar-crop";
import { readStoredImage, renderAvatarCrop } from "@/lib/uploads/avatar-image";
import { deleteReplacedImage, isOwnedImageUrl, storeImage } from "@/lib/uploads/image-storage";
import { ImageRejectedError } from "@/lib/uploads/process-image";

/*
 * The avatar library behind Administration › Back of the store (Sweep B3/D) and the
 * Reader/Writer default choices. Each library avatar has one StoreItem (its
 * name, visibility and order in the Store). Defaults are display-time
 * fallbacks only: changing them never touches a member's own picture
 * (User.image).
 */

/**
 * Adds an uploaded image as a library avatar and as a Store item (last in the
 * Store's order, visible). The image must come from the platform-avatar upload.
 */
export async function addPlatformAvatar(actorId: string, input: { url: string; label: string; crop?: AvatarCrop | null }) {
  const url = input.url.trim();
  const label = input.label.replace(/\s+/g, " ").trim().slice(0, 80) || "Avatar";
  if (!isOwnedImageUrl(url) || !new URL(url).pathname.startsWith("/images/platform-avatar/")) {
    return { ok: false as const, status: 400, message: "Upload the image with the avatar uploader first." };
  }
  const screened = await screenStoreImage(url);
  if (!screened.ok) return { ok: false as const, status: 400, message: screened.message };
  // Sweep I: the upload is the original; members get a 320px crop cut with the
  // admin's focus (centered when none was sent).
  const focused = await cutFocus(url, input.crop ?? CENTERED_CROP);
  if (!focused.ok) return focused;
  const avatar = await prisma.$transaction(async (tx) => {
    const created = await tx.platformAvatar.create({
      data: { url: focused.url, originalUrl: url, cropX: focused.crop.x, cropY: focused.crop.y, zoom: focused.crop.zoom, label, createdById: actorId },
      select: { id: true, label: true, url: true, createdAt: true },
    });
    const last = await tx.storeItem.aggregate({ where: { category: "AVATAR" }, _max: { sortOrder: true } });
    const item = await tx.storeItem.create({
      data: {
        category: "AVATAR",
        name: label,
        imageUrl: focused.url,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        platformAvatarId: created.id,
        createdById: actorId,
      },
      select: { id: true },
    });
    await recordAudit(tx, { action: AUDIT.AVATAR_ADDED, actorId, details: { avatarId: created.id, storeItemId: item.id } });
    return created;
  });
  return { ok: true as const, avatar };
}

/** Cuts the 320px avatar out of an original in our store and stores it. */
async function cutFocus(originalUrl: string, requested: AvatarCrop) {
  try {
    const original = await readStoredImage(originalUrl);
    const crop = clampCrop(requested, original.width, original.height);
    const rendered = await renderAvatarCrop(original.data, original.width, original.height, crop);
    return { ok: true as const, url: await storeImage("platform-avatar", rendered), crop };
  } catch (error) {
    if (error instanceof ImageRejectedError) return { ok: false as const, status: 400, message: error.message };
    throw error;
  }
}

/**
 * Re-focuses a library avatar (Sweep I). A new crop file is made from the
 * original; in one transaction the avatar, its Store item and every member
 * and profile using the old picture move to the new one, so nobody who chose
 * it is left on a missing file. Avatars from before Sweep I have no original:
 * their current image becomes it.
 */
export async function focusPlatformAvatar(actorId: string, id: string, requested: AvatarCrop) {
  const avatar = await prisma.platformAvatar.findUnique({ where: { id }, select: { id: true, url: true, originalUrl: true } });
  if (!avatar) return { ok: false as const, status: 404, message: "Avatar not found." };
  const originalUrl = avatar.originalUrl ?? avatar.url;
  if (!isOwnedImageUrl(originalUrl)) {
    return { ok: false as const, status: 400, message: "This avatar wasn't uploaded here, so it can't be re-focused." };
  }
  const focused = await cutFocus(originalUrl, requested);
  if (!focused.ok) return focused;
  await prisma.$transaction(async (tx) => {
    await tx.platformAvatar.update({
      where: { id },
      data: { url: focused.url, originalUrl, cropX: focused.crop.x, cropY: focused.crop.y, zoom: focused.crop.zoom },
    });
    await tx.storeItem.updateMany({ where: { platformAvatarId: id }, data: { imageUrl: focused.url } });
    await tx.user.updateMany({ where: { image: avatar.url, avatarOriginalUrl: null }, data: { image: focused.url } });
    await tx.authorProfile.updateMany({ where: { profileImage: avatar.url }, data: { profileImage: focused.url } });
    await recordAudit(tx, { action: AUDIT.AVATAR_FOCUSED, actorId, details: { avatarId: id, crop: focused.crop } });
  });
  // The old crop goes; the original stays (the first time, the old image *is* the original).
  if (avatar.url !== originalUrl) await deleteReplacedImage(avatar.url, focused.url);
  return { ok: true as const, url: focused.url, crop: focused.crop };
}

/**
 * Removes an avatar. If it was a default, that default falls back to the
 * built-in one (FK SET NULL). Members who chose it as their picture fall back
 * to their role default, so nobody is left pointing at a deleted image.
 */
export async function removePlatformAvatar(actorId: string, id: string) {
  const avatar = await prisma.platformAvatar.findUnique({ where: { id }, select: { id: true, url: true, originalUrl: true } });
  if (!avatar) return { ok: false as const, status: 404, message: "Avatar not found." };
  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({ where: { image: avatar.url }, data: { image: null } });
    await tx.authorProfile.updateMany({ where: { profileImage: avatar.url }, data: { profileImage: null } });
    await tx.platformAvatar.delete({ where: { id } });
    await recordAudit(tx, { action: AUDIT.AVATAR_REMOVED, actorId, details: { avatarId: id } });
  });
  await deleteReplacedImage(avatar.url, null);
  await deleteReplacedImage(avatar.originalUrl, null);
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
