import { NextResponse } from "next/server";
import { serverError } from "@/lib/api/writer-studio-request";
import { apiError, requirePlatformOpen } from "@/lib/auth/guards";
import { canViewActivity, listActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";

/*
 * A member's Activity (bookmarks, ratings, comments), newest first;
 * ?before=<nextCursor> for the next page. The owner always; anyone else only
 * when their activityVisibility is PUBLIC (otherwise 403, the same answer
 * whether or not they have any activity).
 */
type Context = { params: { readerId: string } };

export async function GET(request: Request, { params }: Context) {
  const guard = await requirePlatformOpen();
  if (!guard.ok) return guard.response;

  try {
    const owner = await prisma.user.findUnique({
      where: { id: params.readerId },
      select: { id: true, activityVisibility: true },
    });
    if (!owner) return apiError("NOT_FOUND", "Reader not found.");
    if (!canViewActivity(owner, guard.user?.id)) return apiError("FORBIDDEN", "This reader's activity is private.");

    const before = new URL(request.url).searchParams.get("before");
    return NextResponse.json(await listActivity(owner.id, before));
  } catch (error) {
    console.error("List activity failed.", error);
    return serverError();
  }
}
