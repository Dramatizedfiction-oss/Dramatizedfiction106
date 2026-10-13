import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiRole } from "@/lib/auth/guards";
import { resolveAiTagReport } from "@/lib/ai-tag-reports";
import { failureResponse } from "@/lib/engagement";

/*
 * Board/CEO decision on an open AI-tag report: { action: "MARK_REVIEWED" } or
 * { action: "DISMISS" }. Audited. The tag itself is never changed here.
 */
type Context = { params: { reportId: string } };

const schema = z.object({ action: z.enum(["MARK_REVIEWED", "DISMISS"]) }).strict();

export async function PATCH(request: Request, { params }: Context) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const result = await resolveAiTagReport(guard.user, params.reportId, body.data.action);
    if (!result.ok) return failureResponse(result);
    return NextResponse.json({ resolved: true });
  } catch (error) {
    console.error("Resolve AI tag report failed.", error);
    return serverError();
  }
}
