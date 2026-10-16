import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/writer-studio-request";
import { apiError, requireApiRole } from "@/lib/auth/guards";
import { getContentState, saveContent } from "@/lib/content/service";

/*
 * One Administration › Content item (Sweep B3). Board and CEO only; JSON
 * 401/403 for everyone else.
 *   GET: the current values (or built-in text), version and last editor.
 *   PUT: { baseVersion, values } saves a new version; 409 CONFLICT if someone
 *        saved since baseVersion; 400 INVALID with `field` when a value is
 *        refused. Audited.
 */
type Context = { params: { key: string } };

export async function GET(_request: Request, { params }: Context) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  try {
    const state = await getContentState(params.key);
    if (!state) return apiError("NOT_FOUND", "Content item not found.");
    return NextResponse.json(state);
  } catch (error) {
    console.error("Content read failed.", error);
    return serverError();
  }
}

export async function PUT(request: Request, { params }: Context) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;

  let body: { baseVersion?: unknown; values?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return badRequest("Malformed JSON body.");
  }
  try {
    const result = await saveContent(guard.user.id, params.key, body?.baseVersion, body?.values);
    if (!result.ok) {
      return NextResponse.json({ error: result.message, code: result.code, field: result.field }, { status: result.status });
    }
    return NextResponse.json(result.state);
  } catch (error) {
    console.error("Content save failed.", error);
    return serverError();
  }
}
