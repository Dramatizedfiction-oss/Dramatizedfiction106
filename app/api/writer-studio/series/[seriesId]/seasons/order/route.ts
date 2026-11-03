import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, seasonRefused, serverError } from "@/lib/api/writer-studio-request";
import { requireApiRole, requireOwnedSeries } from "@/lib/auth/guards";
import { invalidateFeed } from "@/lib/feed/invalidate";
import { reorderSeasons } from "@/lib/season-rules";
import { changeSeasonLayout } from "@/lib/seasons";

/*
 * PUT: reorder the seasons of the writer's own series (Sweep G). Body:
 * { seasonIds } naming every season exactly once, in the new order. Seasons
 * and every episode are renumbered; readers' order follows.
 */
const orderSchema = z.object({ seasonIds: z.array(z.string().min(1).max(191)).min(1).max(100) });

export async function PUT(request: Request, { params }: { params: { seriesId: string } }) {
  const guard = await requireApiRole("WRITER");
  if (!guard.ok) return guard.response;

  const owned = await requireOwnedSeries(params.seriesId, guard.user.id);
  if (!owned.ok) return owned.response;

  const body = await parseJsonBody(request, orderSchema);
  if (!body.ok) return body.response;

  try {
    const result = await changeSeasonLayout(owned.series.id, (layout) => reorderSeasons(layout, body.data.seasonIds) ?? "BAD_ORDER");
    if (!result.ok) return seasonRefused(result.reason);
    invalidateFeed();
    return NextResponse.json({ success: true, seasonIds: result.layout.map((season) => season.id) });
  } catch (error) {
    console.error("Reordering seasons failed.", error);
    return serverError();
  }
}
