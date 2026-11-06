import sharp from "sharp";
import { AVATAR_CROP_SIZE, AVATAR_MIN_SOURCE_SIDE, cropRect, type AvatarCrop } from "@/lib/avatar-crop";
import { MAX_SOURCE_PIXELS, MAX_UPLOAD_BYTES } from "./image-purposes";
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
  // Sweep 1: never follow a redirect away from our store, give up after 15 s,
  // and refuse anything larger than an upload could ever be.
  const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!response?.ok) throw new ImageRejectedError("Couldn't read the stored image. Please try again.");
  if (Number(response.headers.get("content-length") || 0) > MAX_UPLOAD_BYTES) {
    throw new ImageRejectedError("The stored image is too large.");
  }
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length > MAX_UPLOAD_BYTES) throw new ImageRejectedError("The stored image is too large.");
  const meta = await sharp(data, { failOn: "error", limitInputPixels: MAX_SOURCE_PIXELS }).metadata();
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
