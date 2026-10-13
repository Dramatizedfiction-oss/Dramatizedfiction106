import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireApiUser } from "@/lib/auth/guards";
import { badRequest, parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { parsePercent } from "@/lib/reading-progress-rules";
import { saveProgress } from "@/lib/reading-progress";

/*
 * PUT { percent }: how far the signed-in member has read this episode (0-100).
 * Only the furthest point is kept. JSON errors only: 401, 403, 404, 503.
 */
type Context = { params: { episodeId: string } };

const schema = z.object({ percent: z.number() }).strict();

export async function PUT(request: Request, { params }: Context) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;
  const percent = parsePercent(body.data.percent);
  if (percent === null) return badRequest("Invalid progress.");

  try {
    const result = await saveProgress(guard.user.id, params.episodeId, percent);
    if (!result) return apiError("NOT_FOUND", "That episode isn't available.");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Saving reading progress failed.", error);
    return serverError();
  }
}
