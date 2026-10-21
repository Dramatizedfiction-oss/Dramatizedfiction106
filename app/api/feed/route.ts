import { NextResponse } from "next/server";
import { serverError } from "@/lib/api/writer-studio-request";
import { requirePlatformOpen } from "@/lib/auth/guards";
import { parseExploreSort } from "@/lib/explore-ranking";
import { FEED_MAX_SHELVES } from "@/lib/feed/config";
import { getFeed } from "@/lib/feed/server";

/*
 * GET /api/feed?sort=trending|newest&from=N: the next shelves of Explore's
 * feed ("More shelves"). Public: signed-out visitors get the shared daily
 * feed, members their own (personal shelves only from their own history,
 * taken from the session). JSON only: 400 bad `from`, 503 Renovation Mode.
 */
export async function GET(request: Request) {
  const guard = await requirePlatformOpen();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const from = Number(url.searchParams.get("from") ?? "0");
  if (!Number.isInteger(from) || from < 0 || from > FEED_MAX_SHELVES) {
    return NextResponse.json({ error: "Invalid request.", code: "BAD_REQUEST" }, { status: 400 });
  }
  const sort = parseExploreSort(url.searchParams.get("sort"));
  const reader = guard.user && !guard.user.restriction ? guard.user.id : null;

  try {
    const page = await getFeed({ readerId: reader, sort, from });
    return NextResponse.json(
      { shelves: page.shelves, next: page.next },
      { headers: { "Cache-Control": reader ? "private, no-store" : "public, max-age=60" } },
    );
  } catch (error) {
    console.error("Feed page failed.", error);
    return serverError();
  }
}
