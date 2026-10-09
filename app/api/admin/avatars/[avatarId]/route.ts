import { NextResponse } from "next/server";
import { removePlatformAvatar } from "@/lib/admin/avatars-service";
import { jsonError } from "@/lib/api/json";
import { requireApiRole } from "@/lib/auth/guards";

// BOARD and CEO: remove a library avatar. A default using it falls back to the built-in avatar.
export async function DELETE(_request: Request, { params }: { params: { avatarId: string } }) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;

  try {
    const result = await removePlatformAvatar(guard.user.id, params.avatarId);
    if (!result.ok) return jsonError(result.status, "NOT_FOUND", result.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Removing platform avatar failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Please try again.");
  }
}
