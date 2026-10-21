import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { invalidateFeed } from "@/lib/feed/invalidate";
import { pruneExposure } from "@/lib/feed/exposure";
import { refreshAllStatsOnce } from "@/lib/feed/stats";
import { prisma } from "@/lib/prisma";

/*
 * GET /api/cron/feed-refresh: the daily Vercel cron (vercel.json). Refreshes
 * every series' feed stats, prunes old New Writers impressions and old
 * rate-limit rows, and clears the feed cache. Vercel sends
 * "Authorization: Bearer $CRON_SECRET"; without a configured secret (16+
 * characters) the route refuses everything. JSON only: 401, 503.
 */
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return null;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  const check = authorized(request);
  if (check === null) {
    return NextResponse.json({ error: "Cron is not configured.", code: "NOT_CONFIGURED" }, { status: 503 });
  }
  if (!check) return NextResponse.json({ error: "Not allowed.", code: "UNAUTHENTICATED" }, { status: 401 });

  try {
    const refreshed = await refreshAllStatsOnce();
    const exposurePruned = await pruneExposure();
    const rateLimitPruned = await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
    invalidateFeed();
    return NextResponse.json({ refreshed, exposurePruned, rateLimitPruned: rateLimitPruned.count });
  } catch (error) {
    console.error("Feed cron failed.", error);
    return NextResponse.json({ error: "Something went wrong.", code: "SERVER_ERROR" }, { status: 500 });
  }
}
