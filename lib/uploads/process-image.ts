import sharp from "sharp";
import {
  IMAGE_PURPOSES,
  MAX_SOURCE_DIMENSION,
  MAX_SOURCE_PIXELS,
  MAX_UPLOAD_BYTES,
  type ImagePurpose,
} from "./image-purposes";

/*
 * Server-side image validation and normalization. Server-only.
 *
 *  1. Size cap (MAX_UPLOAD_BYTES).
 *  2. The real type comes from the file's leading bytes (JPEG, PNG, WebP);
 *     the browser's MIME type and file name are ignored. SVG/HTML/anything
 *     else is rejected.
 *  3. sharp decodes it with a pixel limit (decompression bombs) and fails on
 *     corrupt data; source dimensions are capped.
 *  4. It is re-encoded to WebP, auto-rotated from EXIF and resized to fit the
 *     purpose. Re-encoding drops all metadata (e.g. GPS from phone photos)
 *     and anything appended to the original file.
 */

export class ImageRejectedError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 | 415 = 400,
  ) {
    super(message);
  }
}

type SniffedType = "jpeg" | "png" | "webp";

function sniffImageType(bytes: Buffer): SniffedType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export async function processImage(bytes: Buffer, purpose: ImagePurpose) {
  if (bytes.length === 0) throw new ImageRejectedError("The file is empty.");
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new ImageRejectedError("That image is too large. Please choose one under 4 MB.", 413);
  }

  const type = sniffImageType(bytes);
  if (!type) {
    throw new ImageRejectedError("Please choose a JPEG, PNG or WebP image.", 415);
  }

  const source = sharp(bytes, { limitInputPixels: MAX_SOURCE_PIXELS, failOn: "error", animated: false });

  let metadata: Awaited<ReturnType<typeof source.metadata>>;
  try {
    metadata = await source.metadata();
  } catch {
    throw new ImageRejectedError("That file couldn't be read as an image. It may be damaged.");
  }

  if (metadata.format !== type || !metadata.width || !metadata.height) {
    throw new ImageRejectedError("That file couldn't be read as an image. It may be damaged.");
  }

  if (metadata.width > MAX_SOURCE_DIMENSION || metadata.height > MAX_SOURCE_DIMENSION) {
    throw new ImageRejectedError(
      `That image is too large (${metadata.width}×${metadata.height}). Please use one under ${MAX_SOURCE_DIMENSION} pixels on each side.`,
      413,
    );
  }

  const limits = IMAGE_PURPOSES[purpose];

  try {
    const { data, info } = await source
      .rotate()
      .resize({ width: limits.maxWidth, height: limits.maxHeight, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    return { data, width: info.width, height: info.height };
  } catch {
    throw new ImageRejectedError("That file couldn't be read as an image. It may be damaged.");
  }
}
