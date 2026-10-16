import { NextResponse } from "next/server";
import { serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { listFollowedAuthors } from "@/lib/author-follows";

/*
 * The writers the signed-in member follows (Library > People). Always the
 * caller's own; no user id is accepted.
 */
export async function GET() {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  try {
    return NextResponse.json({ people: await listFollowedAuthors(guard.user.id) });
  } catch (error) {
    console.error("Followed writers read failed.", error);
    return serverError();
  }
}
