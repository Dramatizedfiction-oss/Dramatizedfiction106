import { NextResponse } from "next/server";
import { authorizeImageUpload } from "@/lib/uploads/authorize";
import { IMAGE_PURPOSES, MAX_UPLOAD_BYTES, isImagePurpose } from "@/lib/uploads/image-purposes";
import { isImageStorageConfigured, storeImage } from "@/lib/uploads/image-storage";
import { ImageRejectedError, processImage } from "@/lib/uploads/process-image";

export const runtime = "nodejs";

function fail(message: string, status: number, code: string) {
  return NextResponse.json({ error: message, code }, { status });
}

/**
 * POST multipart/form-data: purpose, targetId (series/episode covers), file.
 * Authorizes the purpose server-side, validates and re-encodes the image, and
 * stores it. Returns its URL; the caller then saves that URL through the
 * existing route for the record (which checks ownership again).
 */
export async function POST(request: Request) {
  // Reject obviously oversized bodies before reading them.
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_UPLOAD_BYTES + 64 * 1024) {
    return fail("That image is too large. Please choose one under 4 MB.", 413, "TOO_LARGE");
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("The upload couldn't be read. Please try again.", 400, "BAD_REQUEST");
  }

  const purpose = form.get("purpose");
  if (!isImagePurpose(purpose)) {
    return fail("Unknown image type.", 400, "BAD_REQUEST");
  }

  const rawTarget = form.get("targetId");
  const targetId = typeof rawTarget === "string" && rawTarget ? rawTarget : null;
  if (IMAGE_PURPOSES[purpose].needsTarget && !targetId) {
    return fail("Missing target.", 400, "BAD_REQUEST");
  }

  const authorization = await authorizeImageUpload(purpose, targetId);
  if (!authorization.ok) return authorization.response;

  if (!isImageStorageConfigured()) {
    return fail("Image uploads aren't set up yet. Please try again later.", 503, "STORAGE_NOT_CONFIGURED");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return fail("Please choose an image to upload.", 400, "BAD_REQUEST");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return fail("That image is too large. Please choose one under 4 MB.", 413, "TOO_LARGE");
  }

  try {
    const processed = await processImage(Buffer.from(await file.arrayBuffer()), purpose);
    const url = await storeImage(purpose, processed.data);
    return NextResponse.json({ url, width: processed.width, height: processed.height });
  } catch (error) {
    if (error instanceof ImageRejectedError) {
      return fail(error.message, error.status, "IMAGE_REJECTED");
    }
    console.error("Image upload failed.", error);
    return fail("The image couldn't be uploaded right now. Please try again.", 502, "STORAGE_ERROR");
  }
}
