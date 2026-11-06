import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/json";
import { requireApiUser } from "@/lib/auth/guards";
import { parseFrameChoice } from "@/lib/store/rules";
import { setMemberFrame } from "@/lib/store/service";

/*
 * The signed-in member's frame (Sweep I), always their own account:
 *   PUT { choice: "level" }                 the earned writer-level frame (none for readers)
 *   PUT { choice: "none" }                  no frame at all
 *   PUT { choice: "store", itemId }         an active Store frame
 */
export async function PUT(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;
  const body = await request.json().catch(() => null);
  const choice = parseFrameChoice(body);
  if (!choice) return jsonError(400, "BAD_REQUEST", "Choose a frame, your level frame or no frame.");

  try {
    const result = await setMemberFrame(guard.user.id, choice);
    if (!result.ok) return jsonError(result.status, "NOT_FOUND", result.message);
    return NextResponse.json({ success: true, choice: result.choice });
  } catch (error) {
    console.error("Choosing a frame failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Please try again.");
  }
}
