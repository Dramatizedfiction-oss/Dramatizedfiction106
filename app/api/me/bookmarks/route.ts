import { NextResponse } from "next/server";
import { serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { listBookmarks } from "@/lib/bookmarks";

/*
 * The signed-in member's own bookmarks, newest first, published episodes only.
 * ?before=<nextCursor> loads the next page. Never another member's.
 */
export async function GET(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  try {
    const before = new URL(request.url).searchParams.get("before");
    return NextResponse.json(await listBookmarks(guard.user.id, before));
  } catch (error) {
    console.error("List bookmarks failed.", error);
    return serverError();
  }
}
