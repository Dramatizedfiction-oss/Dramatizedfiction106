import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/json";
import { requireApiRole } from "@/lib/auth/guards";
import { refreshFeedNow } from "@/lib/feed/admin";

/*
 * POST: recompute every series' feed stats now and clear the feed cache
 * (otherwise hourly when visited, daily by the cron, and per series on
 * publish). Board and CEO. Answers { refreshed } (false when another refresh
 * was already running). JSON only: 401, 403, 503.
 */
export async function POST() {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  try {
    return NextResponse.json({ refreshed: await refreshFeedNow() });
  } catch (error) {
    console.error("Feed refresh failed.", error);
    return jsonError(500, "SERVER_ERROR", "Something went wrong.");
  }
}
