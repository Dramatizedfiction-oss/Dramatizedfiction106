import sharp from "sharp";
import { clampCrop, type AvatarCrop } from "@/lib/avatar-crop";
import { isLibraryImagePath } from "@/lib/avatar-library";
import { prisma } from "@/lib/prisma";
import { prepareAvatarOriginal, renderAvatarCrop } from "@/lib/uploads/avatar-image";
import { deleteReplacedImage, isOwnedImageUrl, storeImage } from "@/lib/uploads/image-storage";

/*
 * A member's own photo. Every function acts on the member id it is given;
 * routes only ever pass the signed-in member's own id, and no image URL is
 * ever taken from the browser: the original is uploaded once here, and later
 * adjustments re-cut it from the stored copy.
 *
 * Stored: User.image = the 320px crop, User.avatarOriginalUrl = the resized
 * original, plus the crop values. Replaced files are deleted; library avatars
 * are shared and never deleted.
 */

const photoSelect = {
  image: true,
  avatarOriginalUrl: true,
  avatarCropX: true,
  avatarCropY: true,
  avatarZoom: true,
} as const;

/** Old files to delete once the new state is saved (never library images). */
async function cleanUp(previous: { image: string | null; avatarOriginalUrl: string | null }, next: { image: string | null; avatarOriginalUrl: string | null }) {
  if (!isLibraryImagePath(previous.image)) await deleteReplacedImage(previous.image, next.image);
  await deleteReplacedImage(previous.avatarOriginalUrl, next.avatarOriginalUrl);
}

async function savePhoto(userId: string, data: { image: string | null; avatarOriginalUrl: string | null; crop: AvatarCrop | null }) {
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        image: data.image,
        avatarOriginalUrl: data.avatarOriginalUrl,
        avatarCropX: data.crop?.x ?? null,
        avatarCropY: data.crop?.y ?? null,
        avatarZoom: data.crop?.zoom ?? null,
      },
      select: photoSelect,
    }),
    // Writers keep a copy of their picture on AuthorProfile.
    prisma.authorProfile.updateMany({ where: { userId }, data: { profileImage: data.image } }),
  ]);
  return updated;
}

export function photoState(user: {
  image: string | null;
  avatarOriginalUrl: string | null;
  avatarCropX: number | null;
  avatarCropY: number | null;
  avatarZoom: number | null;
}) {
  const hasPhoto = Boolean(user.avatarOriginalUrl);
  return {
    image: user.image,
    originalUrl: user.avatarOriginalUrl,
    crop:
      hasPhoto && user.avatarCropX !== null && user.avatarCropY !== null && user.avatarZoom !== null
        ? { x: user.avatarCropX, y: user.avatarCropY, zoom: user.avatarZoom }
        : null,
  };
}

/** A new photo: stores the resized original and its crop, replacing any previous picture. */
export async function setPhoto(userId: string, bytes: Buffer, requested: AvatarCrop) {
  const previous = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: photoSelect });
  const original = await prepareAvatarOriginal(bytes);
  const crop = clampCrop(requested, original.width, original.height);
  const cropped = await renderAvatarCrop(original.data, original.width, original.height, crop);

  const originalUrl = await storeImage("profile-original", original.data);
  const imageUrl = await storeImage("profile-image", cropped);
  const updated = await savePhoto(userId, { image: imageUrl, avatarOriginalUrl: originalUrl, crop });
  await cleanUp(previous, updated);
  return photoState(updated);
}

export type AdjustResult = { ok: true; state: ReturnType<typeof photoState> } | { ok: false; status: number; code: string; message: string };

/** Re-cuts the stored original with a new position and zoom. */
export async function adjustPhoto(userId: string, requested: AvatarCrop): Promise<AdjustResult> {
  const previous = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: photoSelect });
  if (!previous.avatarOriginalUrl || !isOwnedImageUrl(previous.avatarOriginalUrl)) {
    return { ok: false, status: 409, code: "NO_PHOTO", message: "Upload a photo first." };
  }

  const response = await fetch(previous.avatarOriginalUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Original photo unavailable (${response.status}).`);
  const original = Buffer.from(await response.arrayBuffer());
  const { width, height } = await sharp(original).metadata();
  if (!width || !height) throw new Error("Original photo unreadable.");

  const crop = clampCrop(requested, width, height);
  const imageUrl = await storeImage("profile-image", await renderAvatarCrop(original, width, height, crop));
  const updated = await savePhoto(userId, { image: imageUrl, avatarOriginalUrl: previous.avatarOriginalUrl, crop });
  await cleanUp(previous, updated);
  return { ok: true, state: photoState(updated) };
}

/** Back to the role default: clears the picture (photo or library avatar) and deletes the photo's files. */
export async function removePicture(userId: string) {
  const previous = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: photoSelect });
  const updated = await savePhoto(userId, { image: null, avatarOriginalUrl: null, crop: null });
  await cleanUp(previous, updated);
  return photoState(updated);
}
