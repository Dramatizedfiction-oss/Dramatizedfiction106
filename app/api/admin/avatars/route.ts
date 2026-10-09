import { NextResponse } from "next/server";
import { z } from "zod";
import { addPlatformAvatar, setDefaultAvatars } from "@/lib/admin/avatars-service";
import { jsonError, parseStrictBody } from "@/lib/api/json";
import { requireApiRole } from "@/lib/auth/guards";

// BOARD and CEO: add an uploaded image to the shared avatar library.
const addSchema = z.object({ url: z.string().min(1).max(500), label: z.string().max(120) }).strict();

export async function POST(request: Request) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  const body = await parseStrictBody(request, addSchema);
  if (!body.ok) return body.response;

  try {
    const result = await addPlatformAvatar(guard.user.id, body.data);
    if (!result.ok) return jsonError(result.status, "BAD_REQUEST", result.message);
    return NextResponse.json({ success: true, avatar: result.avatar }, { status: 201 });
  } catch (error) {
    console.error("Adding platform avatar failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Please try again.");
  }
}

// BOARD and CEO: choose the Reader and Writer defaults (null = built-in).
const defaultsSchema = z
  .object({ readerId: z.string().max(191).nullable(), writerId: z.string().max(191).nullable(), confirm: z.literal(true) })
  .strict();

export async function PUT(request: Request) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  const body = await parseStrictBody(request, defaultsSchema);
  if (!body.ok) return body.response;

  try {
    const result = await setDefaultAvatars(guard.user.id, body.data);
    if (!result.ok) return jsonError(result.status, "BAD_REQUEST", result.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Setting default avatars failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Please try again.");
  }
}
