import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { deleteComment, editComment } from "@/lib/comments";
import { failureResponse } from "@/lib/engagement";

/*
 * PATCH  { body }  edit your own comment (same rules as posting).
 * DELETE           your own comment: deleted. The series author or Board/CEO:
 *                  removed (hidden, kept for its reports). Anyone else: 403.
 */
type Context = { params: { commentId: string } };

const schema = z.object({ body: z.string().max(5000) }).strict();

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const result = await editComment(guard.user.id, params.commentId, body.data.body);
    if (!result.ok) return failureResponse(result);
    return NextResponse.json({ comment: result.comment });
  } catch (error) {
    console.error("Edit comment failed.", error);
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  try {
    const result = await deleteComment(guard.user, params.commentId);
    if (!result.ok) return failureResponse(result);
    return NextResponse.json({ outcome: result.outcome });
  } catch (error) {
    console.error("Delete comment failed.", error);
    return serverError();
  }
}
