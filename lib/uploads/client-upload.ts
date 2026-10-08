"use client";

import { MAX_ORIGINAL_BYTES, MAX_UPLOAD_BYTES, type ImagePurpose } from "./image-purposes";

/*
 * Browser side of image uploads: early checks, shrinking big photos so they
 * fit the server limit, and the upload itself with progress. The server
 * re-validates everything; nothing here is trusted.
 */

const SHRINK_MAX_EDGE = 3000;
const SHRINK_ABOVE_BYTES = MAX_UPLOAD_BYTES - 256 * 1024;

export type UploadResult = { ok: true; url: string } | { ok: false; message: string };

/** Downscales large photos in the browser (JPEG output); returns the original if it already fits. */
async function prepareFile(file: File): Promise<Blob> {
  if (file.size <= SHRINK_ABOVE_BYTES) return file;
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // the server will explain what's wrong with it
  }

  const scale = Math.min(1, SHRINK_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.9, 0.8, 0.7]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= SHRINK_ABOVE_BYTES) return blob;
  }
  return file;
}

export async function uploadImage(options: {
  file: File;
  purpose: ImagePurpose;
  targetId?: string | null;
  onProgress?: (fraction: number) => void;
}): Promise<UploadResult> {
  const { file, purpose, targetId, onProgress } = options;

  if (file.type && !file.type.startsWith("image/")) {
    return { ok: false, message: "That file isn't an image. Please choose a JPEG, PNG or WebP image." };
  }
  if (file.size > MAX_ORIGINAL_BYTES) {
    return { ok: false, message: "That image is too large. Please choose one under 25 MB." };
  }

  const prepared = await prepareFile(file);
  if (prepared.size > MAX_UPLOAD_BYTES) {
    return { ok: false, message: "That image is too large to upload. Please choose a smaller image." };
  }

  const form = new FormData();
  form.append("purpose", purpose);
  if (targetId) form.append("targetId", targetId);
  form.append("file", prepared, "upload");

  return new Promise<UploadResult>((resolve) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/uploads/image");
    request.withCredentials = true;
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    request.onerror = () =>
      resolve({ ok: false, message: "The upload didn't go through. Check your connection and try again." });
    request.onload = () => {
      const payload = request.response as { url?: string; error?: string } | null;
      if (request.status >= 200 && request.status < 300 && payload?.url) {
        resolve({ ok: true, url: payload.url });
        return;
      }
      if (request.status === 401) {
        resolve({ ok: false, message: "Your session has expired. Sign in again, then retry." });
        return;
      }
      resolve({ ok: false, message: payload?.error || "The image couldn't be uploaded. Please try again." });
    };
    request.send(form);
  });
}
