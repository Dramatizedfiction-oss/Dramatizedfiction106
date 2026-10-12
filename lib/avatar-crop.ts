// Client-safe geometry for positioning a photo inside the avatar circle.
// The browser editor and the server use the same rules, and the server
// re-applies them to whatever the browser sends.
//
// A crop is { x, y, zoom } for an original of width W and height H:
//   - the circle's diameter, in original pixels, is min(W, H) / zoom;
//   - (x, y) is the circle's center as a fraction (0-1) of W and H.
// zoom >= 1 and the circle always stays inside the photo, so the photo can
// never be smaller than the circle and no empty edge ever shows.

export const AVATAR_MIN_ZOOM = 1;
export const AVATAR_MAX_ZOOM = 4;
/** Largest side of the stored original. */
export const AVATAR_ORIGINAL_MAX = 1024;
/** Side of the stored circle crop: 160px avatars on 2x screens. */
export const AVATAR_CROP_SIZE = 320;
/** Photos smaller than this on their shorter side are refused (they would look blurry). */
export const AVATAR_MIN_SOURCE_SIDE = 160;

export type AvatarCrop = { x: number; y: number; zoom: number };

export const CENTERED_CROP: AvatarCrop = { x: 0.5, y: 0.5, zoom: 1 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The crop made valid for a W x H photo: zoom in range, circle fully inside. */
export function clampCrop(crop: AvatarCrop, width: number, height: number): AvatarCrop {
  const zoom = clamp(Number.isFinite(crop.zoom) ? crop.zoom : 1, AVATAR_MIN_ZOOM, AVATAR_MAX_ZOOM);
  const diameter = Math.min(width, height) / zoom;
  const halfX = diameter / 2 / width;
  const halfY = diameter / 2 / height;
  return {
    x: clamp(Number.isFinite(crop.x) ? crop.x : 0.5, halfX, 1 - halfX),
    y: clamp(Number.isFinite(crop.y) ? crop.y : 0.5, halfY, 1 - halfY),
    zoom,
  };
}

/** The square of the original (whole pixels, inside the photo) that becomes the avatar. */
export function cropRect(crop: AvatarCrop, width: number, height: number) {
  const valid = clampCrop(crop, width, height);
  const size = Math.max(1, Math.min(width, height, Math.round(Math.min(width, height) / valid.zoom)));
  const left = clamp(Math.round(valid.x * width - size / 2), 0, width - size);
  const top = clamp(Math.round(valid.y * height - size / 2), 0, height - size);
  return { left, top, width: size, height: size };
}

/** Parses a crop from untrusted input; null when it isn't three finite numbers. */
export function parseCrop(value: unknown): AvatarCrop | null {
  if (!value || typeof value !== "object") return null;
  const { x, y, zoom } = value as Record<string, unknown>;
  if (![x, y, zoom].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  return { x: x as number, y: y as number, zoom: zoom as number };
}

/**
 * How the editor draws the photo inside a circle `viewport` pixels wide:
 * the displayed image size and its offset from the circle's top-left corner.
 */
export function cropLayout(crop: AvatarCrop, width: number, height: number, viewport: number) {
  const valid = clampCrop(crop, width, height);
  const scale = (viewport * valid.zoom) / Math.min(width, height);
  return {
    scale,
    width: width * scale,
    height: height * scale,
    left: viewport / 2 - valid.x * width * scale,
    top: viewport / 2 - valid.y * height * scale,
  };
}

/** Moves the crop by a drag of (dx, dy) screen pixels in a `viewport`-wide circle. */
export function dragCrop(crop: AvatarCrop, dx: number, dy: number, width: number, height: number, viewport: number) {
  const { scale } = cropLayout(crop, width, height, viewport);
  return clampCrop({ ...crop, x: crop.x - dx / (width * scale), y: crop.y - dy / (height * scale) }, width, height);
}

/** Changes the zoom, keeping the circle's center where it is (then clamped). */
export function zoomCrop(crop: AvatarCrop, zoom: number, width: number, height: number) {
  return clampCrop({ ...crop, zoom }, width, height);
}
