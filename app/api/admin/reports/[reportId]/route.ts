import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiRole } from "@/lib/auth/guards";
import { failureResponse } from "@/lib/engagement";
import { resolveReport } from "@/lib/reports";

/*
 * Board/CEO decision on an open comment report:
 * { action: "REMOVE_COMMENT" } hides the comment and closes its open reports;
 * { action: "DISMISS" } closes this report only. Both are audited.
 */
type Context = { params: { reportId: string } };

const schema = z.object({ action: z.enum(["REMOVE_COMMENT", "DISMISS"]) }).strict();

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const result = await resolveReport(guard.user, params.reportId, body.data.action);
    if (!result.ok) return failureResponse(result);
    return NextResponse.json({ resolved: true });
  } catch (error) {
    console.error("Resolve report failed.", error);
    return serverError();
  }
}
