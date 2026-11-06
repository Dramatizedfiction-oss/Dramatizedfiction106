import sharp from "sharp";
import { AVATAR_CROP_SIZE, AVATAR_MIN_SOURCE_SIDE, cropRect, type AvatarCrop } from "@/lib/avatar-crop";
import { isOwnedImageUrl } from "./image-storage";
import { ImageRejectedError, processImage } from "./process-image";

/*
 * Image work for a member's own photo. Server-only, no storage: callers store
 * the results. The uploaded file goes through the shared validation in
 * process-image.ts (real type from the bytes, size and pixel limits, EXIF
 * rotation, metadata stripped) and is kept as a WebP of at most 1024px; the
 * avatar itself is a 320px square cut from it.
 */

/** Validates and resizes an uploaded photo into the stored original. */
export async function prepareAvatarOriginal(bytes: Buffer) {
  const original = await processImage(bytes, "profile-original");
  if (Math.min(original.width, original.height) < AVATAR_MIN_SOURCE_SIDE) {
    throw new ImageRejectedError(
      `That photo is too small. Please use one at least ${AVATAR_MIN_SOURCE_SIDE} pixels on each side.`,
    );
  }
  return original;
}

/**
 * Reads an image this app stored (an avatar original) back from blob storage,
 * with its size. Only our own store's URLs are read, never anything else.
 */
export async function readStoredImage(url: string) {
  if (!isOwnedImageUrl(url)) throw new ImageRejectedError("That image isn't one of ours.");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new ImageRejectedError("Couldn't read the stored image. Please try again.");
  const data = Buffer.from(await response.arrayBuffer());
  const meta = await sharp(data, { failOn: "error" }).metadata();
  if (!meta.width || !meta.height) throw new ImageRejectedError("The stored image couldn't be read.");
  return { data, width: meta.width, height: meta.height };
}

/** Cuts the circle's square out of the original and resizes it to 320px. */
export async function renderAvatarCrop(original: Buffer, width: number, height: number, crop: AvatarCrop) {
  const rect = cropRect(crop, width, height);
  return sharp(original, { failOn: "error" })
    .extract(rect)
    .resize(AVATAR_CROP_SIZE, AVATAR_CROP_SIZE, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();
}
