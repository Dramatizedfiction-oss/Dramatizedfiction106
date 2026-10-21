import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, parseStrictBody } from "@/lib/api/json";
import { requireApiRole } from "@/lib/auth/guards";
import { setSeriesModeration } from "@/lib/feed/admin";
import { SERIES_MODERATION } from "@/lib/feed/shelf-rules";

/*
 * PATCH { moderationStatus, note? }: hold, release (VISIBLE), block or send a
 * series for review. Only VISIBLE series appear in the feed, Explore and the
 * series page's rows. Board and CEO; audited. JSON only: 400, 401, 403, 404, 503.
 */
const schema = z.object({ moderationStatus: z.enum(SERIES_MODERATION), note: z.string().max(2000).optional() }).strict();

export async function PATCH(request: Request, { params }: { params: { seriesId: string } }) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  const body = await parseStrictBody(request, schema);
  if (!body.ok) return body.response;
  try {
    const result = await setSeriesModeration(guard.user.id, params.seriesId, body.data.moderationStatus, body.data.note ?? "");
    if (!result.ok) return jsonError(result.status, result.code, result.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Series moderation failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong. Nothing was changed.");
  }
}
