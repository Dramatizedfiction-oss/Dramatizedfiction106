import sharp from "sharp";
import { AVATAR_CROP_SIZE, AVATAR_MIN_SOURCE_SIDE, cropRect, type AvatarCrop } from "@/lib/avatar-crop";
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

/** Cuts the circle's square out of the original and resizes it to 320px. */
export async function renderAvatarCrop(original: Buffer, width: number, height: number, crop: AvatarCrop) {
  const rect = cropRect(crop, width, height);
  return sharp(original, { failOn: "error" })
    .extract(rect)
    .resize(AVATAR_CROP_SIZE, AVATAR_CROP_SIZE, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();
}
