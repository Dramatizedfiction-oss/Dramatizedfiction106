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

// Other frames (Sweep 14: 2:3 book covers) pass `aspect` = frame width /
// height; the default 1 is the avatar circle. At zoom 1 the frame is the
// largest of that shape that fits the photo.

/** Frame size in original pixels at this zoom. */
function frameSize(zoom: number, width: number, height: number, aspect: number) {
  const frameHeight = Math.min(height, width / aspect) / zoom;
  return { frameWidth: frameHeight * aspect, frameHeight };
}

/** The crop made valid for a W x H photo: zoom in range, frame fully inside. */
export function clampCrop(crop: AvatarCrop, width: number, height: number, aspect = 1): AvatarCrop {
  const zoom = clamp(Number.isFinite(crop.zoom) ? crop.zoom : 1, AVATAR_MIN_ZOOM, AVATAR_MAX_ZOOM);
  const { frameWidth, frameHeight } = frameSize(zoom, width, height, aspect);
  const halfX = frameWidth / 2 / width;
  const halfY = frameHeight / 2 / height;
  return {
    x: clamp(Number.isFinite(crop.x) ? crop.x : 0.5, halfX, 1 - halfX),
    y: clamp(Number.isFinite(crop.y) ? crop.y : 0.5, halfY, 1 - halfY),
    zoom,
  };
}

/** The rectangle of the original (whole pixels, inside the photo) that becomes the image. */
export function cropRect(crop: AvatarCrop, width: number, height: number, aspect = 1) {
  const valid = clampCrop(crop, width, height, aspect);
  const frame = frameSize(valid.zoom, width, height, aspect);
  const rectWidth = Math.max(1, Math.min(width, Math.round(frame.frameWidth)));
  const rectHeight = Math.max(1, Math.min(height, Math.round(frame.frameHeight)));
  const left = clamp(Math.round(valid.x * width - rectWidth / 2), 0, width - rectWidth);
  const top = clamp(Math.round(valid.y * height - rectHeight / 2), 0, height - rectHeight);
  return { left, top, width: rectWidth, height: rectHeight };
}

/** Parses a crop from untrusted input; null when it isn't three finite numbers. */
export function parseCrop(value: unknown): AvatarCrop | null {
  if (!value || typeof value !== "object") return null;
  const { x, y, zoom } = value as Record<string, unknown>;
  if (![x, y, zoom].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  return { x: x as number, y: y as number, zoom: zoom as number };
}

/**
 * How the editor draws the photo inside a frame `viewport` pixels wide (and
 * viewport / aspect tall): the displayed image size and its offset from the
 * frame's top-left corner.
 */
export function cropLayout(crop: AvatarCrop, width: number, height: number, viewport: number, aspect = 1) {
  const valid = clampCrop(crop, width, height, aspect);
  const scale = viewport / frameSize(valid.zoom, width, height, aspect).frameWidth;
  return {
    scale,
    width: width * scale,
    height: height * scale,
    left: viewport / 2 - valid.x * width * scale,
    top: viewport / aspect / 2 - valid.y * height * scale,
  };
}

/** Moves the crop by a drag of (dx, dy) screen pixels in a `viewport`-wide frame. */
export function dragCrop(crop: AvatarCrop, dx: number, dy: number, width: number, height: number, viewport: number, aspect = 1) {
  const { scale } = cropLayout(crop, width, height, viewport, aspect);
  return clampCrop({ ...crop, x: crop.x - dx / (width * scale), y: crop.y - dy / (height * scale) }, width, height, aspect);
}

/** Changes the zoom, keeping the frame's center where it is (then clamped). */
export function zoomCrop(crop: AvatarCrop, zoom: number, width: number, height: number, aspect = 1) {
  return clampCrop({ ...crop, zoom }, width, height, aspect);
}
