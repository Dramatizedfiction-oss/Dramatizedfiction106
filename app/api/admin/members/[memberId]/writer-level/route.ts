import { NextResponse } from "next/server";
import { z } from "zod";
import { changeWriterLevel } from "@/lib/admin/writer-level-service";
import { jsonError, parseStrictBody } from "@/lib/api/json";
import { requireApiRole } from "@/lib/auth/guards";

/*
 * PATCH { level }: set a writer's level (BEGINNER, FULL, FEATURED, ELITE),
 * which also decides their avatar frame. BOARD and CEO; who may change whom is
 * in lib/admin/policy.ts. The acting account only ever comes from the session.
 */
const schema = z.object({ level: z.string().max(20) }).strict();

export async function PATCH(request: Request, { params }: { params: { memberId: string } }) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;

  const body = await parseStrictBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const result = await changeWriterLevel({ actorId: guard.user.id, targetId: params.memberId, level: body.data.level });
    if (!result.ok) return jsonError(result.status, result.code, result.message);
    return NextResponse.json({ success: true, level: result.level });
  } catch (error) {
    console.error("Writer level change failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Nothing was changed.");
  }
}
