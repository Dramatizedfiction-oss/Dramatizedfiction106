import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/json";
import { requireApiRole } from "@/lib/auth/guards";
import { addFrameItem } from "@/lib/store/service";
import { FRAME_UPLOAD_MAX_BYTES } from "@/lib/store/rules";
import { prepareFrameImage } from "@/lib/uploads/frame-image";
import { isImageStorageConfigured, storeImage } from "@/lib/uploads/image-storage";
import { ImageRejectedError } from "@/lib/uploads/process-image";

export const runtime = "nodejs";

/*
 * BOARD and CEO: upload a Store frame (Sweep I). Multipart: file + name.
 * PNG/WebP must be square with a transparent background; SVG is cleaned by an
 * allow-list and rasterised. The server makes the stored 512px WebP itself;
 * no URL is taken from the browser. Renaming, hiding, reordering and removing
 * use the shared /api/admin/store/items routes.
 */
export async function POST(request: Request) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;

  if (Number(request.headers.get("content-length") || 0) > FRAME_UPLOAD_MAX_BYTES + 64 * 1024) {
    return jsonError(413, "TOO_LARGE", "That frame is too large. Please keep it under 1 MB.");
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "BAD_REQUEST", "The upload couldn't be read. Please try again.");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return jsonError(400, "BAD_REQUEST", "Please choose a frame image.");
  if (file.size > FRAME_UPLOAD_MAX_BYTES) return jsonError(413, "TOO_LARGE", "That frame is too large. Please keep it under 1 MB.");
  if (!isImageStorageConfigured()) return jsonError(503, "STORAGE_UNAVAILABLE", "Image storage isn't set up yet.");

  try {
    const image = await prepareFrameImage(Buffer.from(await file.arrayBuffer()));
    const imageUrl = await storeImage("store-frame", image);
    const result = await addFrameItem(guard.user.id, { name: form.get("name"), imageUrl });
    if (!result.ok) return jsonError(result.status, "BAD_REQUEST", result.message);
    return NextResponse.json({ success: true, item: result.item }, { status: 201 });
  } catch (error) {
    if (error instanceof ImageRejectedError) return jsonError(error.status, "IMAGE_REJECTED", error.message);
    console.error("Adding a Store frame failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Please try again.");
  }
}
