import { NextResponse } from "next/server";
import { serverError } from "@/lib/api/writer-studio-request";
import { apiError, requireApiUser } from "@/lib/auth/guards";
import { followSeries, unfollowSeries } from "@/lib/series-follows";

/*
 * Follow (PUT) or unfollow (DELETE) a series as the signed-in member. Both are
 * idempotent and answer { following, followerCount }. JSON errors only:
 * 401 signed out, 403 restricted, 503 renovation, 404 series missing/unpublished.
 */
type Context = { params: { seriesId: string } };

export async function PUT(_request: Request, { params }: Context) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  try {
    const result = await followSeries(guard.user.id, params.seriesId);
    if (!result) return apiError("NOT_FOUND", "That series isn't available to follow.");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Follow series failed.", error);
    return serverError();
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  try {
    return NextResponse.json(await unfollowSeries(guard.user.id, params.seriesId));
  } catch (error) {
    console.error("Unfollow series failed.", error);
    return serverError();
  }
}
