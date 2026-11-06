import { del, put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { coverThumbUrl } from "@/lib/cover-thumbs";
import { prisma } from "@/lib/prisma";
import type { ImagePurpose } from "./image-purposes";

/*
 * The app's single image store: Vercel Blob (public store). Server-only.
 * Credentials, either of:
 *  - BLOB_STORE_ID + Vercel OIDC (newer stores): on Vercel the OIDC token is
 *    provided automatically once the store is connected to the project;
 *    locally `vercel env pull` writes VERCEL_OIDC_TOKEN (expires after ~12h).
 *  - BLOB_READ_WRITE_TOKEN (older stores).
 *
 * Stored names are server-generated and unguessable:
 *   images/<purpose>/<uuid>.webp
 * The file name, extension and type sent by the browser are never used.
 */

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";
const IMAGE_PREFIX = "/images/";

export function isImageStorageConfigured() {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

/** The store's id, from BLOB_STORE_ID ("store_<id>") or the read-write token ("vercel_blob_rw_<id>_<secret>"). */
function storeId() {
  const fromEnv = process.env.BLOB_STORE_ID?.trim();
  if (fromEnv) return fromEnv.replace(/^store_/, "");
  const match = /^vercel_blob_rw_([a-z0-9]+)_/i.exec(process.env.BLOB_READ_WRITE_TOKEN || "");
  return match ? match[1] : null;
}

/** Public URLs of the store are served from "<storeid>.public.blob.vercel-storage.com". */
function storeHost() {
  const id = storeId();
  return id ? `${id.toLowerCase()}${BLOB_HOST_SUFFIX}` : null;
}

/** True only for images this app uploaded into its own store. */
export function isOwnedImageUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.pathname.startsWith(IMAGE_PREFIX)) return false;
    // Our own store only: with no store id configured, nothing counts as ours
    // (another Blob store's files must never be accepted or deleted).
    const host = storeHost();
    return host !== null && url.hostname === host;
  } catch {
    return false;
  }
}

export async function storeImage(purpose: ImagePurpose, data: Buffer) {
  const result = await put(`images/${purpose}/${randomUUID()}.webp`, data, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  return result.url;
}

/**
 * Stores a cover's small copy at the derived name next to it (lib/cover-thumbs.ts).
 * `overwrite` is for the one-time backfill script.
 */
export async function storeCoverThumb(coverUrl: string, data: Buffer, overwrite = false) {
  const thumb = coverThumbUrl(coverUrl);
  if (!thumb) return null;
  await put(new URL(thumb).pathname.slice(1), data, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
    allowOverwrite: overwrite,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
  });
  return thumb;
}

/**
 * True while any record still shows this image (Sweep 1). Image URLs are
 * public, so a URL may have been copied onto another record; a file is only
 * deleted once nothing uses it any more.
 */
export async function isImageStillUsed(url: string) {
  const counts = await Promise.all([
    prisma.user.count({ where: { OR: [{ image: url }, { bannerImage: url }, { avatarOriginalUrl: url }] } }),
    prisma.authorProfile.count({ where: { profileImage: url } }),
    prisma.series.count({ where: { coverImage: url } }),
    prisma.episode.count({ where: { coverImage: url } }),
    prisma.profileLibraryItem.count({ where: { coverImage: url } }),
    prisma.platformAvatar.count({ where: { OR: [{ url }, { originalUrl: url }] } }),
    prisma.storeItem.count({ where: { imageUrl: url } }),
  ]);
  return counts.some((count) => count > 0);
}

/**
 * Deletes a replaced/removed image, but only if it lives in our own store and
 * no record still uses it. External and legacy URLs are never touched.
 * Failures are logged, not thrown: the record update that triggered this has
 * already succeeded. Callers update or delete their row first.
 */
export async function deleteReplacedImage(previous: string | null | undefined, next: string | null | undefined) {
  if (!previous || previous === next || !isOwnedImageUrl(previous) || !isImageStorageConfigured()) return;
  try {
    if (await isImageStillUsed(previous)) return;
    // A cover's small copy goes with it (deleting a missing blob is a no-op).
    const thumb = coverThumbUrl(previous);
    await del(thumb ? [previous, thumb] : previous);
  } catch (error) {
    console.error("Could not delete replaced image.", error);
  }
}

export type ImageFieldDecision =
  | { ok: true; value: string | null | undefined }
  | { ok: false; message: string };

/**
 * Validates a new value for an image field (series/episode cover, profile
 * picture/banner). Accepts: leaving it out (undefined), clearing it, keeping
 * the value already stored (so legacy external URLs keep working), or an image
 * uploaded to our store. Any other URL is rejected.
 */
export function decideImageField(
  next: unknown,
  current: string | null | undefined,
  /** The upload purpose this field takes: another purpose's image (a Store avatar, someone's cover) is refused. */
  purpose: "series-cover" | "episode-cover" | "profile-banner",
): ImageFieldDecision {
  if (next === undefined) return { ok: true, value: undefined };
  if (next === null) return { ok: true, value: null };
  if (typeof next !== "string") return { ok: false, message: "Invalid image." };

  const trimmed = next.trim();
  if (!trimmed) return { ok: true, value: null };
  if (current && trimmed === current) return { ok: true, value: current };
  if (isOwnedImageUrl(trimmed) && new URL(trimmed).pathname.startsWith(`${IMAGE_PREFIX}${purpose}/`)) {
    return { ok: true, value: trimmed };
  }

  return { ok: false, message: "Use the image uploader to add a new image." };
}
