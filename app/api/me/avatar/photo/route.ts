import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { parseCrop } from "@/lib/avatar-crop";
import { adjustPhoto, removePicture, setPhoto } from "@/lib/avatar-photo";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads/image-purposes";
import { isImageStorageConfigured } from "@/lib/uploads/image-storage";
import { ImageRejectedError } from "@/lib/uploads/process-image";

export const runtime = "nodejs";

/*
 * The signed-in member's own profile photo. No user id and no image URL is
 * ever accepted: the account comes from the session and the server makes
 * every file itself.
 *   POST   multipart: file + x, y, zoom   upload a photo and its position
 *   PATCH  { x, y, zoom }                 re-position the current photo
 *   DELETE                                back to the default picture
 * Library avatars are chosen through PATCH /api/me/profile-images.
 */

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(request: Request) {
  const guard = await requireApiUser();
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
  if (!(file instanceof File)) return badRequest("Please choose a photo.");
  if (file.size > MAX_UPLOAD_BYTES) return fail(413, "TOO_LARGE", "That image is too large. Please choose one under 4 MB.");
  const crop = parseCrop({ x: Number(form.get("x")), y: Number(form.get("y")), zoom: Number(form.get("zoom")) });
  if (!crop) return badRequest("Invalid photo position.");
  if (!isImageStorageConfigured()) {
    return fail(503, "STORAGE_NOT_CONFIGURED", "Photo uploads aren't set up yet. Please try again later.");
  }

  try {
    const state = await setPhoto(guard.user.id, Buffer.from(await file.arrayBuffer()), crop);
    return NextResponse.json(state);
  } catch (error) {
    if (error instanceof ImageRejectedError) return fail(error.status, "IMAGE_REJECTED", error.message);
    console.error("Profile photo upload failed.", error);
    return fail(502, "STORAGE_ERROR", "Your photo couldn't be saved right now. Please try again.");
  }
}

const adjustSchema = z.object({ x: z.number(), y: z.number(), zoom: z.number() }).strict();

export async function PATCH(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, adjustSchema);
  if (!body.ok) return body.response;
  const crop = parseCrop(body.data);
  if (!crop) return badRequest("Invalid photo position.");

  try {
    const result = await adjustPhoto(guard.user.id, crop);
    if (!result.ok) return fail(result.status, result.code, result.message);
    return NextResponse.json(result.state);
  } catch (error) {
    console.error("Profile photo adjustment failed.", error);
    return fail(502, "STORAGE_ERROR", "Your photo couldn't be updated right now. Please try again.");
  }
}

export async function DELETE() {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  try {
    return NextResponse.json(await removePicture(guard.user.id));
  } catch (error) {
    console.error("Removing profile picture failed.", error);
    return serverError();
  }
}
