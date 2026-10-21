import { NextResponse } from "next/server";
import { parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { failureResponse } from "@/lib/engagement";
import { rateLimitedResponse, takeRateLimit } from "@/lib/rate-limit";
import { RATING_RATE_LIMITS } from "@/lib/rate-limit-rules";
import { clearRating, rateEpisode } from "@/lib/ratings";
import { z } from "zod";

/*
 * The signed-in member's rating of an episode: PUT { value: 1-5 } sets or
 * changes it, DELETE clears it. Both answer { value }. JSON errors only:
 * 400 bad value, 401, 403 restricted / OWN_EPISODE / LOCKED, 404,
 * 429 RATE_LIMITED (RATING_RATE_LIMITS), 503.
 */
type Context = { params: { episodeId: string } };

const schema = z.object({ value: z.unknown() }).strict();

export async function PUT(request: Request, { params }: Context) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;

  try {
    if (!(await takeRateLimit(guard.user.id, "rating", RATING_RATE_LIMITS))) return rateLimitedResponse();
    const result = await rateEpisode(guard.user.id, params.episodeId, body.data.value);
    if (!result.ok) return failureResponse(result);
    return NextResponse.json({ value: result.value });
  } catch (error) {
    console.error("Rate episode failed.", error);
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  try {
    if (!(await takeRateLimit(guard.user.id, "rating", RATING_RATE_LIMITS))) return rateLimitedResponse();
    const result = await clearRating(guard.user.id, params.episodeId);
    if (!result.ok) return failureResponse(result);
    return NextResponse.json({ value: null });
  } catch (error) {
    console.error("Clear rating failed.", error);
    return serverError();
  }
}
