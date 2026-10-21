import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { serverError } from "@/lib/api/writer-studio-request";
import { requirePlatformOpen } from "@/lib/auth/guards";
import { parseExploreSort } from "@/lib/explore-ranking";
import { utcDay } from "@/lib/feed/composer";
import { recordNewWriterExposure } from "@/lib/feed/exposure";
import { getFeed } from "@/lib/feed/server";

/*
 * POST /api/feed/exposure { sort }: counts one New Writers impression for the
 * writers this visitor's first Explore screen showed (Sweep C fairness). The
 * server recomputes which writers those were (the feed is deterministic for
 * the visitor and day), so the browser can't name writers. At most once per
 * visitor per day (httpOnly cookie). Answers { counted }. JSON only.
 */
const SEEN_COOKIE = "df-nw-seen";

export async function POST(request: Request) {
  const guard = await requirePlatformOpen();
  if (!guard.ok) return guard.response;

  const today = utcDay(Date.now());
  if (cookies().get(SEEN_COOKIE)?.value === today) return NextResponse.json({ counted: 0 });

  let sort = parseExploreSort(null);
  try {
    const body = (await request.json()) as { sort?: unknown };
    sort = parseExploreSort(typeof body?.sort === "string" ? body.sort : null);
  } catch {
    // No body: the default order.
  }

  try {
    const reader = guard.user && !guard.user.restriction ? guard.user.id : null;
    const page = await getFeed({ readerId: reader, sort, from: 0 });
    const counted = await recordNewWriterExposure(page.newWriterAuthorIds);
    const response = NextResponse.json({ counted });
    response.cookies.set(SEEN_COOKIE, today, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return response;
  } catch (error) {
    console.error("Feed exposure failed.", error);
    return serverError();
  }
}
