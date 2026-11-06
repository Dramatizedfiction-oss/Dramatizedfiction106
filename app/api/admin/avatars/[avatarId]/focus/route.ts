import { NextResponse } from "next/server";
import { z } from "zod";
import { focusPlatformAvatar } from "@/lib/admin/avatars-service";
import { jsonError, parseStrictBody } from "@/lib/api/json";
import { requireApiRole } from "@/lib/auth/guards";

// BOARD and CEO: re-focus a library avatar (Sweep I). Members using it move to the new crop.
const schema = z.object({ x: z.number().finite(), y: z.number().finite(), zoom: z.number().finite() }).strict();

export async function PUT(request: Request, { params }: { params: { avatarId: string } }) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  const body = await parseStrictBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const result = await focusPlatformAvatar(guard.user.id, params.avatarId, body.data);
    if (!result.ok) return jsonError(result.status, result.status === 404 ? "NOT_FOUND" : "BAD_REQUEST", result.message);
    return NextResponse.json({ success: true, url: result.url, crop: result.crop });
  } catch (error) {
    console.error("Re-focusing platform avatar failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Please try again.");
  }
}
