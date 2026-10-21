import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/json";
import { requireApiRole } from "@/lib/auth/guards";
import { searchSeries } from "@/lib/feed/admin";

/*
 * GET ?q=: published series by title or writer name (12 at most), for the
 * Staff Picks editor and the score breakdown. Board and CEO. JSON only.
 */
export async function GET(request: Request) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 100);
  try {
    const results = await searchSeries(q);
    return NextResponse.json({
      series: results.map((series) => ({
        id: series.id,
        title: series.title,
        authorName: series.author.name,
        moderationStatus: series.moderationStatus,
      })),
    });
  } catch (error) {
    console.error("Feed series search failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong.");
  }
}
