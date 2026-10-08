import { del, put } from "@vercel/blob";
import { randomUUID } from "crypto";
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
    const host = storeHost();
    return host ? url.hostname === host : url.hostname.endsWith(BLOB_HOST_SUFFIX);
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
 * Deletes a replaced/removed image, but only if it lives in our own store.
 * External and legacy URLs are never touched. Failures are logged, not thrown:
 * the record update that triggered this has already succeeded.
 */
export async function deleteReplacedImage(previous: string | null | undefined, next: string | null | undefined) {
  if (!previous || previous === next || !isOwnedImageUrl(previous) || !isImageStorageConfigured()) return;
  try {
    await del(previous);
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
export function decideImageField(next: unknown, current: string | null | undefined): ImageFieldDecision {
  if (next === undefined) return { ok: true, value: undefined };
  if (next === null) return { ok: true, value: null };
  if (typeof next !== "string") return { ok: false, message: "Invalid image." };

  const trimmed = next.trim();
  if (!trimmed) return { ok: true, value: null };
  if (current && trimmed === current) return { ok: true, value: current };
  if (isOwnedImageUrl(trimmed)) return { ok: true, value: trimmed };

  return { ok: false, message: "Use the image uploader to add a new image." };
}
