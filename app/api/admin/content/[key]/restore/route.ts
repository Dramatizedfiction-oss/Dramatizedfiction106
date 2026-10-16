import { NextResponse } from "next/server";
import { badRequest, serverError } from "@/lib/api/writer-studio-request";
import { requireApiRole } from "@/lib/auth/guards";
import { restoreContent } from "@/lib/content/service";

/*
 * Restore an earlier version of a Content item (Board and CEO only):
 * { version, baseVersion }. Version 0 is the built-in text. The old text is
 * saved again as a new version (nothing is overwritten) and audited.
 */
export async function POST(request: Request, { params }: { params: { key: string } }) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;

  let body: { version?: unknown; baseVersion?: unknown } | null;
  try {
    body = await request.json();
  } catch {
    return badRequest("Malformed JSON body.");
  }
  try {
    const result = await restoreContent(guard.user.id, params.key, body?.version, body?.baseVersion);
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });
    return NextResponse.json(result.state);
  } catch (error) {
    console.error("Content restore failed.", error);
    return serverError();
  }
}
