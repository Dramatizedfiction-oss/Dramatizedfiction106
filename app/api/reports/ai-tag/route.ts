import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { fileAiTagReport } from "@/lib/ai-tag-reports";
import { failureResponse } from "@/lib/engagement";

/*
 * POST { seriesId } or { episodeId }, plus optional suggestedTag (AI_FREE,
 * AI_CORRECTED, AI_HEAVY, AI_WRITTEN or null for "not sure") and note: report
 * that a published series' or episode's AI tag is wrong. Signed-in members;
 * not your own story; one open report per member per item. Reviewed in
 * Administration > Reports (AI tags).
 */
const schema = z
  .object({
    seriesId: z.string().max(191).optional(),
    episodeId: z.string().max(191).optional(),
    suggestedTag: z.string().max(20).nullable().optional(),
    note: z.string().max(2000).optional(),
  })
  .strict();

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;

  try {
    const result = await fileAiTagReport(guard.user.id, body.data);
    if (!result.ok) return failureResponse(result);
    return NextResponse.json({ reported: true }, { status: result.created ? 201 : 200 });
  } catch (error) {
    console.error("AI tag report failed.", error);
    return serverError();
  }
}
