import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseStrictBody } from "@/lib/api/json";
import { requireApiRole } from "@/lib/auth/guards";
import { setStaffPicks } from "@/lib/feed/admin";

/*
 * PUT { seriesIds }: the whole Staff Picks list in order (published series,
 * up to MAX_STAFF_PICKS). Board and CEO; audited. JSON only: 400, 401, 403, 404, 503.
 */
const schema = z.object({ seriesIds: z.array(z.string().max(64)).max(50) }).strict();

export async function PUT(request: Request, { params }: { params: { shelfId: string } }) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  const body = await parseStrictBody(request, schema);
  if (!body.ok) return body.response;
  try {
    const result = await setStaffPicks(guard.user.id, params.shelfId, body.data.seriesIds);
    if (!result.ok) return jsonError(result.status, result.code, result.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Staff picks update failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Nothing was changed.");
  }
}
