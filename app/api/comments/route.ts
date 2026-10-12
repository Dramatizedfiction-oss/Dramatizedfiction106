import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { apiError, requireApiUser, requirePlatformOpen } from "@/lib/auth/guards";
import { listComments, postComment } from "@/lib/comments";
import { failureResponse } from "@/lib/engagement";

/*
 * GET  ?episodeId=…&cursor=…  a page of a published episode's comments (public).
 * POST { episodeId, body }    post a comment as the signed-in member: 1-1,000
 *                             characters of plain text, rate-limited, a repeat
 *                             tap returns the comment already posted.
 * JSON errors only (401, 403, 404, 429, 503).
 */
export async function GET(request: Request) {
  const guard = await requirePlatformOpen();
  if (!guard.ok) return guard.response;

  try {
    const query = new URL(request.url).searchParams;
    const page = await listComments(query.get("episodeId") ?? "", query.get("cursor"));
    if (!page) return apiError("NOT_FOUND", "That episode isn't available.");
    return NextResponse.json(page);
  } catch (error) {
    console.error("List comments failed.", error);
    return serverError();
  }
}

const schema = z.object({ episodeId: z.string(), body: z.string().max(5000) }).strict();

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const result = await postComment(guard.user.id, body.data.episodeId, body.data.body);
    if (!result.ok) return failureResponse(result);
    return NextResponse.json({ comment: result.comment }, { status: result.created ? 201 : 200 });
  } catch (error) {
    console.error("Post comment failed.", error);
    return serverError();
  }
}
