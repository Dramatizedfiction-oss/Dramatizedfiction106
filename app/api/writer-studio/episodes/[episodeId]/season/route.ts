import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody, seasonRefused, serverError } from "@/lib/api/writer-studio-request";
import { requireApiRole, requireOwnedEpisode, requireOwnedSeries } from "@/lib/auth/guards";
import { invalidateFeed } from "@/lib/feed/invalidate";
import { prisma } from "@/lib/prisma";
import { moveEpisode } from "@/lib/season-rules";
import { changeSeasonLayout } from "@/lib/seasons";

/*
 * POST: move the writer's own episode to another season of the same series
 * (Sweep G). Body: { seasonId }. Into a later season it becomes that
 * season's first episode, into an earlier one its last; everything is
 * renumbered. Works for drafts and live episodes (the Studio asks first for
 * a live one, since readers' order changes).
 */
const moveSchema = z.object({ seasonId: z.string().min(1).max(191) });

export async function POST(request: Request, { params }: { params: { episodeId: string } }) {
  const guard = await requireApiRole("WRITER");
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, moveSchema);
  if (!body.ok) return body.response;

  const owned = await requireOwnedEpisode(params.episodeId, guard.user.id);
  if (!owned.ok) return owned.response;
  const ownedSeries = await requireOwnedSeries(owned.episode.seriesId, guard.user.id);
  if (!ownedSeries.ok) return ownedSeries.response;

  try {
    const result = await changeSeasonLayout(ownedSeries.series.id, (layout) =>
      // A season of another series isn't in this layout, so it's NOT_FOUND.
      moveEpisode(layout, owned.episode.id, body.data.seasonId) ?? "NOT_FOUND",
    );
    if (!result.ok) return seasonRefused(result.reason);
    invalidateFeed();

    const episode = await prisma.episode.findUniqueOrThrow({
      where: { id: owned.episode.id },
      select: { id: true, episodeNumber: true, seasonEpisodeNumber: true, seasonId: true, season: { select: { number: true } } },
    });
    return NextResponse.json({ success: true, episode });
  } catch (error) {
    console.error("Moving an episode to another season failed.", error);
    return serverError();
  }
}
