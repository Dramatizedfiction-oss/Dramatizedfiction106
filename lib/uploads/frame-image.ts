import sharp from "sharp";
import { FRAME_IMAGE_SIZE, FRAME_MIN_SOURCE_SIDE, FRAME_SQUARE_TOLERANCE } from "@/lib/store/rules";
import { ImageRejectedError, processImage } from "./process-image";
import { looksLikeSvg, sanitizeSvg } from "./svg-sanitize";
import { MAX_SOURCE_PIXELS } from "./image-purposes";

/*
 * A Store frame upload (Sweep I). Server-only. Square images with a
 * transparent background: PNG or WebP go through the shared validation
 * (real type from the bytes, pixel limits, metadata stripped); SVG is
 * cleaned by an allow-list (svg-sanitize.ts) and rasterised. Either way the
 * stored file is a 512px WebP with transparency, so no uploaded SVG is ever
 * served.
 */

export async function prepareFrameImage(bytes: Buffer): Promise<Buffer> {
  if (looksLikeSvg(bytes)) {
    const clean = sanitizeSvg(bytes.toString("utf8"));
    if (!clean) throw new ImageRejectedError("That SVG couldn't be used. Please upload a simple drawing (no scripts or embedded images), under 200 KB.");
    let rendered: { data: Buffer };
    try {
      const source = sharp(Buffer.from(clean), { density: 300, limitInputPixels: MAX_SOURCE_PIXELS, failOn: "error" });
      const meta = await source.metadata();
      checkSquare(meta.width, meta.height);
      rendered = await source
        .resize(FRAME_IMAGE_SIZE, FRAME_IMAGE_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 85, alphaQuality: 100 })
        .toBuffer({ resolveWithObject: true });
    } catch (error) {
      if (error instanceof ImageRejectedError) throw error;
      throw new ImageRejectedError("That SVG couldn't be drawn. Please check the file and try again.");
    }
    return rendered.data;
  }

  // Raster: the shared checks first (type sniffing, size, decompression limits).
  const meta = await sharp(bytes, { limitInputPixels: MAX_SOURCE_PIXELS, failOn: "error" })
    .metadata()
    .catch(() => null);
  if (!meta) throw new ImageRejectedError("Please choose a PNG, WebP or SVG frame.", 415);
  if (meta.format === "jpeg") throw new ImageRejectedError("Frames need a transparent background: please use PNG, WebP or SVG.", 415);
  if (!meta.hasAlpha) throw new ImageRejectedError("Frames need a transparent background (the middle shows the avatar).");
  const processed = await processImage(bytes, "store-frame");
  checkSquare(processed.width, processed.height);
  if (Math.min(processed.width, processed.height) < FRAME_MIN_SOURCE_SIDE) {
    throw new ImageRejectedError(`That frame is too small. Please use one at least ${FRAME_MIN_SOURCE_SIDE} pixels on each side.`);
  }
  return sharp(processed.data, { failOn: "error" })
    .resize(FRAME_IMAGE_SIZE, FRAME_IMAGE_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 85, alphaQuality: 100 })
    .toBuffer();
}

function checkSquare(width: number | undefined, height: number | undefined) {
  if (!width || !height) throw new ImageRejectedError("That frame couldn't be read.");
  if (Math.abs(width - height) / Math.max(width, height) > FRAME_SQUARE_TOLERANCE) {
    throw new ImageRejectedError(`Frames must be square (this one is ${width}×${height}).`);
  }
}
