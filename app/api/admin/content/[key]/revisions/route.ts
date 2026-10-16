import { NextResponse } from "next/server";
import { serverError } from "@/lib/api/writer-studio-request";
import { apiError, requireApiRole } from "@/lib/auth/guards";
import { listRevisions } from "@/lib/content/service";

/* A Content item's saved versions, newest first (Board and CEO only). */
export async function GET(_request: Request, { params }: { params: { key: string } }) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  try {
    const revisions = await listRevisions(params.key);
    if (!revisions) return apiError("NOT_FOUND", "Content item not found.");
    return NextResponse.json({ revisions });
  } catch (error) {
    console.error("Content history read failed.", error);
    return serverError();
  }
}
