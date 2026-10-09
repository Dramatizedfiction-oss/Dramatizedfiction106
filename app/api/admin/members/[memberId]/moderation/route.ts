import { NextResponse } from "next/server";
import { z } from "zod";
import { moderateMember } from "@/lib/admin/moderation-service";
import { jsonError, parseStrictBody } from "@/lib/api/json";
import { requireApiRole } from "@/lib/auth/guards";

/*
 * POST: ban, discipline (one month) or lift a restriction. BOARD and CEO.
 * Who may act on whom is decided in lib/admin/policy.ts (Board can't touch
 * Board or CEO accounts; nobody touches a CEO or themselves). The member id
 * comes from the URL; the acting account only ever comes from the session.
 */
const schema = z
  .object({
    action: z.enum(["BAN", "DISCIPLINE", "LIFT"]),
    reason: z.string().max(2000),
    confirm: z.literal(true),
  })
  .strict();

export async function POST(request: Request, { params }: { params: { memberId: string } }) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;

  const body = await parseStrictBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const result = await moderateMember({
      actorId: guard.user.id,
      targetId: params.memberId,
      action: body.data.action,
      reason: body.data.reason,
    });
    if (!result.ok) return jsonError(result.status, result.code, result.message);
    return NextResponse.json({ success: true, endsAt: result.endsAt?.toISOString() ?? null });
  } catch (error) {
    console.error("Moderation action failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Nothing was changed.");
  }
}
