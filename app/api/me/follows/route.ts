import { NextResponse } from "next/server";
import { serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { getLibrary } from "@/lib/series-follows";

/*
 * The signed-in member's Library: series they follow (published ones only).
 * Always the caller's own; no user id is accepted.
 */
export async function GET() {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  try {
    return NextResponse.json({ series: await getLibrary(guard.user.id) });
  } catch (error) {
    console.error("Library read failed.", error);
    return serverError();
  }
}
