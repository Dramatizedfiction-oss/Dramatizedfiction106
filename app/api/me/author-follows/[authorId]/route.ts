import { NextResponse } from "next/server";
import { serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { followAuthor, unfollowAuthor } from "@/lib/author-follows";
import { failureResponse } from "@/lib/engagement";
import { rateLimitedResponse, takeRateLimit } from "@/lib/rate-limit";
import { FOLLOW_RATE_LIMITS } from "@/lib/rate-limit-rules";

/*
 * Follow (PUT) or unfollow (DELETE) a writer as the signed-in member; the
 * follow goes to the member's own reading profile. Both are idempotent and
 * answer { following, followerCount }. JSON errors only: 401 signed out,
 * 403 restricted, 503 renovation, 400 SELF, 404 not a writer, 429 too many.
 */
type Context = { params: { authorId: string } };

async function handle(follow: boolean, authorId: string) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  try {
    if (!(await takeRateLimit(guard.user.id, "follow", FOLLOW_RATE_LIMITS))) return rateLimitedResponse();
    const result = follow ? await followAuthor(guard.user.id, authorId) : await unfollowAuthor(guard.user.id, authorId);
    if (!result.ok) return failureResponse(result);
    return NextResponse.json({ following: result.following, followerCount: result.followerCount });
  } catch (error) {
    console.error(follow ? "Follow author failed." : "Unfollow author failed.", error);
    return serverError();
  }
}

export function PUT(_request: Request, { params }: Context) {
  return handle(true, params.authorId);
}

export function DELETE(_request: Request, { params }: Context) {
  return handle(false, params.authorId);
}
