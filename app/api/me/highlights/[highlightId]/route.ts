import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { apiError, requireApiUser } from "@/lib/auth/guards";
import { failureResponse } from "@/lib/engagement";
import { deleteHighlight, updateHighlightNote } from "@/lib/highlights";

/*
 * One of the signed-in member's own highlights (Sweep I). Someone else's
 * looks the same as a missing one (404).
 *   PATCH  { note }   change or clear the private note
 *   DELETE            remove it
 */
const schema = z.object({ note: z.string().max(5000).nullable() }).strict();

export async function PATCH(request: Request, { params }: { params: { highlightId: string } }) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;
  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;
  try {
    const result = await updateHighlightNote(guard.user.id, params.highlightId, body.data.note);
    if (!result.ok) return failureResponse(result);
    return NextResponse.json({ highlight: result.highlight });
  } catch (error) {
    console.error("Update highlight failed.", error);
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: { params: { highlightId: string } }) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;
  try {
    if (!(await deleteHighlight(guard.user.id, params.highlightId))) return apiError("NOT_FOUND", "Highlight not found.");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete highlight failed.", error);
    return serverError();
  }
}
