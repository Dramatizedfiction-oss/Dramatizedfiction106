import sharp from "sharp";
import { clampCrop, cropRect, type AvatarCrop } from "@/lib/avatar-crop";
import { ImageRejectedError, processImage } from "./process-image";

/*
 * Book covers for a writer's profile Library. Server-only, no storage. The
 * upload goes through the shared validation (real type from the bytes, size
 * and pixel limits, EXIF rotation, metadata stripped), then the 2:3 frame the
 * writer positioned is cut out and stored as one 600x900 WebP (~60-90 KB).
 * No original is kept: re-positioning means uploading again.
 */

export const BOOK_COVER_ASPECT = 2 / 3;
export const BOOK_COVER_SIZE = { width: 600, height: 900 } as const;
/** The 2:3 frame must be at least this wide in the source, or the cover looks blurry. */
export const BOOK_COVER_MIN_FRAME_WIDTH = 200;

export async function renderBookCover(bytes: Buffer, requested: AvatarCrop) {
  const source = await processImage(bytes, "profile-book-cover");
  if (Math.min(source.width, source.height * BOOK_COVER_ASPECT) < BOOK_COVER_MIN_FRAME_WIDTH) {
    throw new ImageRejectedError("That image is too small for a cover. Please use one at least 200 × 300 pixels.");
  }
  const crop = clampCrop(requested, source.width, source.height, BOOK_COVER_ASPECT);
  const rect = cropRect(crop, source.width, source.height, BOOK_COVER_ASPECT);
  return sharp(source.data, { failOn: "error" })
    .extract(rect)
    .resize(BOOK_COVER_SIZE.width, BOOK_COVER_SIZE.height, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();
}
