import { NextResponse } from "next/server";
import { badRequest } from "@/lib/api/writer-studio-request";
import { requireApiRole } from "@/lib/auth/guards";
import { parseCrop } from "@/lib/avatar-crop";
import { renderBookCover } from "@/lib/uploads/book-cover-image";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads/image-purposes";
import { isImageStorageConfigured, storeImage } from "@/lib/uploads/image-storage";
import { ImageRejectedError } from "@/lib/uploads/process-image";

export const runtime = "nodejs";

/*
 * POST multipart: file + x, y, zoom (the 2:3 frame the writer positioned).
 * Writers only. The server validates the image and stores one 600x900 WebP
 * cut from it, and returns its URL; the profile editor then saves that URL
 * with the Library card through PUT /api/me/author-profile, which accepts
 * only covers made here. No URL is ever taken from the browser.
 */

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(request: Request) {
  const guard = await requireApiRole("WRITER");
  if (!guard.ok) return guard.response;

  if (Number(request.headers.get("content-length") || 0) > MAX_UPLOAD_BYTES + 64 * 1024) {
    return fail(413, "TOO_LARGE", "That image is too large. Please choose one under 4 MB.");
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("The upload couldn't be read. Please try again.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("Please choose an image.");
  if (file.size > MAX_UPLOAD_BYTES) return fail(413, "TOO_LARGE", "That image is too large. Please choose one under 4 MB.");
  const crop = parseCrop({ x: Number(form.get("x")), y: Number(form.get("y")), zoom: Number(form.get("zoom")) });
  if (!crop) return badRequest("Invalid cover position.");
  if (!isImageStorageConfigured()) {
    return fail(503, "STORAGE_NOT_CONFIGURED", "Image uploads aren't set up yet. Please try again later.");
  }

  try {
    const cover = await renderBookCover(Buffer.from(await file.arrayBuffer()), crop);
    return NextResponse.json({ url: await storeImage("profile-book-cover", cover) });
  } catch (error) {
    if (error instanceof ImageRejectedError) return fail(error.status, "IMAGE_REJECTED", error.message);
    console.error("Book cover upload failed.", error);
    return fail(502, "STORAGE_ERROR", "The cover couldn't be saved right now. Please try again.");
  }
}
