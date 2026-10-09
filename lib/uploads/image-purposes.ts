/*
 * Image upload purposes and limits. Client-safe (no server imports): the
 * upload control uses these for early feedback, and the server enforces them
 * again in app/api/uploads/image.
 *
 * Every image the app stores is one of these purposes. Who may upload for
 * each purpose is decided server-side (see authorizeImageUpload in
 * lib/uploads/authorize.ts); application-wide images, when they exist, will be
 * added here with BOARD-or-above authorization.
 */

export const IMAGE_PURPOSES = {
  "series-cover": { label: "Series cover", maxWidth: 1600, maxHeight: 2400, needsTarget: true },
  "episode-cover": { label: "Episode cover", maxWidth: 2400, maxHeight: 2400, needsTarget: true },
  "profile-image": { label: "Profile picture", maxWidth: 800, maxHeight: 800, needsTarget: false },
  "profile-banner": { label: "Profile banner", maxWidth: 2400, maxHeight: 1200, needsTarget: false },
  // Administration's shared avatar library (BOARD and CEO only).
  "platform-avatar": { label: "Platform avatar", maxWidth: 800, maxHeight: 800, needsTarget: false },
} as const;

export type ImagePurpose = keyof typeof IMAGE_PURPOSES;

export function isImagePurpose(value: unknown): value is ImagePurpose {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(IMAGE_PURPOSES, value);
}

/** Accepted formats, checked against the file's actual bytes on the server. */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Largest file the server accepts. Vercel functions reject request bodies
 * over 4.5 MB, so this leaves room for the multipart envelope. The browser
 * shrinks bigger photos before sending (see components/uploads).
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Largest original the browser will try to shrink before giving up. */
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

/** Decompression-bomb guards for the source image. */
export const MAX_SOURCE_DIMENSION = 6000;
export const MAX_SOURCE_PIXELS = 36_000_000;
