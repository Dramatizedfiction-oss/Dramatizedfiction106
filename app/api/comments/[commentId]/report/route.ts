import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { failureResponse } from "@/lib/engagement";
import { fileReport } from "@/lib/reports";

/*
 * Report someone else's comment: { reason, note? }. One report per member per
 * comment (repeating is accepted and changes nothing). Reviewed by Board/CEO in
 * Administration > Reports.
 */
type Context = { params: { commentId: string } };

const schema = z.object({ reason: z.string(), note: z.string().max(2000).optional() }).strict();

export async function POST(request: Request, { params }: Context) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const result = await fileReport(guard.user.id, params.commentId, body.data);
    if (!result.ok) return failureResponse(result);
    return NextResponse.json({ reported: true });
  } catch (error) {
    console.error("Report comment failed.", error);
    return serverError();
  }
}
