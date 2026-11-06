import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { failureResponse } from "@/lib/engagement";
import { createHighlight, listHighlights } from "@/lib/highlights";

/*
 * The signed-in member's own highlights (Sweep I). Never anyone else's.
 *   GET  ?before=<id>                                  a page, newest first
 *   POST { episodeId, passage: { quote, prefix, suffix }, note? }   save one
 * JSON errors only (400, 401, 403, 404, 409, 429, 503).
 */
export async function GET(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json(await listHighlights(guard.user.id, new URL(request.url).searchParams.get("before")));
  } catch (error) {
    console.error("List highlights failed.", error);
    return serverError();
  }
}

const schema = z
  .object({
    episodeId: z.string().max(191),
    passage: z.object({ quote: z.string().max(400), prefix: z.string().max(100), suffix: z.string().max(100) }).strict(),
    note: z.string().max(5000).nullable().optional(),
  })
  .strict();

export async function POST(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;
  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;
  try {
    const result = await createHighlight(guard.user.id, body.data);
    if (!result.ok) return failureResponse(result);
    return NextResponse.json({ highlight: result.highlight }, { status: 201 });
  } catch (error) {
    console.error("Save highlight failed.", error);
    return serverError();
  }
}
