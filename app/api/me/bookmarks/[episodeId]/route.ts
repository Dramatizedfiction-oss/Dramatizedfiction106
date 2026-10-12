import { NextResponse } from "next/server";
import { serverError } from "@/lib/api/writer-studio-request";
import { apiError, requireApiUser } from "@/lib/auth/guards";
import { addBookmark, removeBookmark } from "@/lib/bookmarks";

/*
 * Bookmark (PUT) or un-bookmark (DELETE) an episode as the signed-in member.
 * Both are idempotent and answer { bookmarked }. JSON errors only:
 * 401 signed out, 403 restricted, 503 renovation, 404 episode missing/unpublished.
 */
type Context = { params: { episodeId: string } };

export async function PUT(_request: Request, { params }: Context) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  try {
    const result = await addBookmark(guard.user.id, params.episodeId);
    if (!result) return apiError("NOT_FOUND", "That episode isn't available to bookmark.");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Bookmark failed.", error);
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  try {
    return NextResponse.json(await removeBookmark(guard.user.id, params.episodeId));
  } catch (error) {
    console.error("Remove bookmark failed.", error);
    return serverError();
  }
}
